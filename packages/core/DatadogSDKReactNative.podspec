require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

# /!\ Remember to keep this version in sync with the other Datadog podspecs:
#     - DatadogSDKReactNativeSessionReplay.podspec
#     - DatadogSDKReactNativeWebView.podspec
#     - DatadogInternalTesting.podspec
datadog_ios_version = '3.16.1'
datadog_ios_spm_url = 'https://github.com/DataDog/dd-sdk-ios.git'
datadog_ios_requirement = { kind: 'exactVersion', version: datadog_ios_version }

# The native iOS SDK is resolved through Swift Package Manager, using React Native's
# `spm_dependency` podspec helper. This requires React Native >= 0.75. Pods can be linked statically
# or as frameworks: see the post-install step below for what each linkage needs.
if !respond_to?(:spm_dependency, true)
  raise "Datadog: the native iOS SDK is resolved through Swift Package Manager, which requires " \
        "React Native >= 0.75 -- the first version to ship the `spm_dependency` podspec helper."
end

# Xcode builds some of the package's frameworks as dynamic frameworks: DatadogInternal, a target
# shared by every product, and a `<Product>_<hash>_PackageProduct` framework for any product that
# more than one pod requests (e.g. DatadogWebViewTracking). The pods link them, but CocoaPods'
# "[CP] Embed Pods Frameworks" phase only embeds pod frameworks, and `spm_dependency` does not
# embed them either, so a Release or archived app crashes at launch with dyld "Library not
# loaded". Debug builds hide it because Xcode adds an rpath to the build folder.
# This extends React Native's SPM post-install step, which every React Native Podfile already
# runs through `react_native_post_install`, so the app embeds them without any Podfile change.
unless defined?(SPM) && SPM.respond_to?(:apply_on_post_install)
  raise "Datadog: could not find React Native's Swift Package Manager integration " \
        "(SPM.apply_on_post_install), which is needed to embed the native iOS SDK frameworks."
end

unless SPM.singleton_class.method_defined?(:datadog_embeds_spm_frameworks?)
  SPM.singleton_class.prepend(Module.new do
    def datadog_embeds_spm_frameworks?
      true
    end

    # When pods are linked statically, Xcode merges the object files of every package product a pod
    # requests, DatadogInternal included, into that pod's static archive. With more than one Datadog
    # pod each archive carries its own copy, and the app fails to link with duplicate symbols. So
    # the core pod, which every other Datadog pod depends on and which is therefore built first,
    # links all of their products, and the others keep only the package reference and the include
    # path they compile against. This runs on the Pods project once React Native has added the
    # package products to it, so it does not depend on how React Native records them.
    def datadog_link_static_products_from_core(installer, core)
      return if core.build_as_dynamic?

      core_target = installer.pods_project.targets.find { |t| t.name == core.label }
      return if core_target.nil?

      packages = core_target.package_product_dependencies.map(&:package).uniq
      installer.pods_project.native_targets.each do |target|
        next if target == core_target
        target.package_product_dependencies.select { |ref| packages.include?(ref.package) }.each do |ref|
          target.package_product_dependencies.delete(ref)
          if core_target.package_product_dependencies.any? { |other| other.package == ref.package && other.product_name == ref.product_name }
            ref.remove_from_project
          else
            core_target.package_product_dependencies << ref
          end
        end
      end
    end

    # Xcode versions before 26 hand each package object to libtool twice when they archive a pod that
    # requests package products, so the core pod's static archive holds two copies of every Datadog
    # object, and the -ObjC flag CocoaPods links apps and tests with loads both: duplicate symbols.
    # This drops the extra byte-identical copies once the archive is built, slice by slice when it is
    # a universal archive, which ar cannot read. Xcode 26 archives each object once, so it finds
    # nothing to remove there and leaves the archive untouched.
    def datadog_dedupe_static_archive(installer, core)
      return if core.build_as_dynamic?

      phase_name = '[Datadog] Remove duplicate Swift package objects'
      target = installer.pods_project.targets.find { |t| t.name == core.label }
      return if target.nil? || target.shell_script_build_phases.any? { |phase| phase.name == phase_name }

      phase = installer.pods_project.new(Xcodeproj::Project::Object::PBXShellScriptBuildPhase)
      phase.name = phase_name
      phase.shell_script = <<~'SH'
        set -e
        archive="${TARGET_BUILD_DIR}/${EXECUTABLE_PATH}"
        has_duplicates() {
          [ -n "$(ar -t "$1" | sort | uniq -d)" ]
        }
        # Pulls every copy of each repeated member out of the archive and puts back one copy of each
        # distinct object, so only byte-identical duplicates go: a same-named object with other code
        # stays.
        dedupe() {
          work="$(mktemp -d "${DERIVED_FILE_DIR}/datadog-dedupe.XXXXXX")"
          ar -t "$1" | sort | uniq -d | while read -r member; do
            count=0
            while ar -t "$1" | grep -qxF "${member}"; do
              count=$((count + 1))
              mkdir "${work}/${count}"
              ar -p "$1" "${member}" > "${work}/${count}/${member}"
              ar -d "$1" "${member}"
            done
            kept=""
            copy=1
            while [ "${copy}" -le "${count}" ]; do
              distinct=true
              for other in ${kept}; do
                if cmp -s "${work}/${copy}/${member}" "${work}/${other}/${member}"; then
                  distinct=false
                  break
                fi
              done
              if [ "${distinct}" = true ]; then
                ar -q "$1" "${work}/${copy}/${member}"
                kept="${kept} ${copy}"
              fi
              copy=$((copy + 1))
            done
            rm -rf "${work:?}"/*
          done
          rm -rf "${work}"
          ranlib "$1"
        }
        archs="$(lipo -archs "${archive}")"
        mkdir -p "${DERIVED_FILE_DIR}"
        if [ "$(echo ${archs} | wc -w)" -eq 1 ]; then
          ar -t "${archive}" > /dev/null
          has_duplicates "${archive}" || exit 0
          dedupe "${archive}"
          exit 0
        fi
        # Universal archive: ar only reads thin archives, so work on each architecture's slice.
        found=false
        set --
        for arch in ${archs}; do
          slice="${DERIVED_FILE_DIR}/datadog-dedupe-${arch}.a"
          lipo -thin "${arch}" "${archive}" -output "${slice}"
          ar -t "${slice}" > /dev/null
          if has_duplicates "${slice}"; then
            found=true
            dedupe "${slice}"
          fi
          set -- "$@" "${slice}"
        done
        [ "${found}" = true ] || exit 0
        lipo -create "$@" -output "${archive}"
      SH
      phase.always_out_of_date = '1'
      target.build_phases << phase
    end

    # CocoaPods numbers the Pods project's UUIDs from a counter without checking for collisions,
    # which only holds while it creates every object itself. By the time post-install hooks run it
    # has made the UUIDs deterministic, and once the batch it had left runs out the counter
    # restarts, so the package objects added below can reuse a taken UUID -- the project root's
    # first -- and Xcode then reports the Pods project as damaged. Whether that happens depends on
    # how many objects the project has. Queue collision-checked UUIDs, generated by Xcodeproj's own
    # implementation, so the objects created from here on never take one that is already in use.
    # React Native 0.87 and later check for collisions themselves (`new_object`), so this only runs on
    # the versions before it.
    def datadog_reserve_unique_uuids(project)
      return if self.class.private_method_defined?(:new_object)

      Xcodeproj::Project.instance_method(:generate_available_uuid_list).bind(project).call(100)
    end

    # React Native 0.87 and later build a statically linked pod that requests package products straight
    # into the shared products directory, which moves its module map from <Pod>/<Module>.modulemap to
    # <Module>.modulemap. React Native updates the app's references to it but not those of other pods,
    # so the Datadog pods that import the core pod fail with "module map file ... not found". This
    # updates their references too, and finds nothing to do on earlier versions or with frameworks.
    def datadog_update_moved_module_map_references(installer)
      datadog_pods = installer.pod_targets.select { |pod| pod.pod_name.start_with?('Datadog') }
      moved = datadog_pods.select do |pod|
        target = installer.pods_project.native_targets.find { |t| t.name == pod.label }
        target && target.build_configurations.any? { |config| config.build_settings['CONFIGURATION_BUILD_DIR'] == '${PODS_CONFIGURATION_BUILD_DIR}' }
      end
      return if moved.empty?

      datadog_pods.each do |pod|
        Dir.glob(File.join(pod.support_files_dir, '*.xcconfig')).each do |path|
          xcconfig = File.read(path)
          updated = moved.reduce(xcconfig) do |acc, moved_pod|
            module_name = moved_pod.product_module_name
            acc.gsub("${PODS_CONFIGURATION_BUILD_DIR}/#{moved_pod.label}/#{module_name}.modulemap",
                     "${PODS_CONFIGURATION_BUILD_DIR}/#{module_name}.modulemap")
          end
          File.write(path, updated) if updated != xcconfig
        end
      end
    end

    # The package requirement written into the embed script, taken from this podspec rather than from
    # React Native's records of it.
    define_method(:datadog_package_requirement) do
      "# #{datadog_ios_spm_url} #{datadog_ios_requirement}\n"
    end

    def apply_on_post_install(installer)
      # When one Podfile builds a pod for more than one platform, e.g. for an iOS and a tvOS app target,
      # CocoaPods adds a suffix to each of its targets' names (DatadogSDKReactNative-iOS), and React
      # Native, which finds a pod's target by the pod's name, fails with "undefined method
      # `package_product_dependencies' for nil".
      if installer.pod_targets.any? { |pod| pod.pod_name == 'DatadogSDKReactNative' && pod.label != pod.pod_name }
        raise "Datadog: the native iOS SDK cannot be resolved through Swift Package Manager when one " \
              "Podfile builds the Datadog pods for more than one platform."
      end

      datadog_reserve_unique_uuids(installer.pods_project)
      core = installer.pod_targets.find { |pod| pod.pod_name == 'DatadogSDKReactNative' }
      datadog_dedupe_static_archive(installer, core) unless core.nil?
      super(installer)
      datadog_link_static_products_from_core(installer, core) unless core.nil?
      datadog_update_moved_module_map_references(installer)
      embed = <<~'SH'
        # Embeds the Datadog Swift package frameworks that Xcode builds dynamically. Looks where Xcode
        # writes them: the products dir, PackageFrameworks, or UninstalledProducts when archiving.
        embed_datadog_spm_frameworks()
        {
          local dir framework found
          for dir in "${PODS_CONFIGURATION_BUILD_DIR}" "${PODS_CONFIGURATION_BUILD_DIR}/PackageFrameworks" "${OBJROOT}/UninstalledProducts/${PLATFORM_NAME}"; do
            found=false
            for framework in "${dir}"/$1.framework; do
              [ -d "${framework}" ] || continue
              found=true
              if file -b "${framework}/$(basename "${framework}" .framework)" | grep -q "dynamically linked"; then
                install_framework "${framework}"
              fi
            done
            [ "${found}" = true ] && return 0
          done
          # Nothing to embed (e.g. every Datadog product is linked statically) is fine; returning the
          # last test's status instead would abort the script, which runs with `set -e`.
          return 0
        }
        embed_datadog_spm_frameworks "DatadogInternal"
        embed_datadog_spm_frameworks "Datadog*_PackageProduct"
      SH
      # The embed phase's file lists only name the pod frameworks. Listing the package requirement makes
      # an SDK version change rewrite this script, an input of the phase, so Xcode runs it again and
      # copies the new frameworks, as React Native does for the frameworks it embeds itself.
      requirements = datadog_package_requirement
      anchor =/^if \[ "\$\{COCOAPODS_PARALLEL_CODE_SIGN\}" == "true" \]; then$/
      installer.aggregate_targets.each do |target|
        next unless target.pod_targets.any? { |pod| pod.pod_name == 'DatadogSDKReactNative' }
        script_path = target.embed_frameworks_script_path
        next unless File.exist?(script_path)
        script = File.read(script_path)
        next if script.include?('embed_datadog_spm_frameworks()')
        unless script.match?(anchor)
          raise "Datadog: could not add the native iOS SDK frameworks to #{script_path}, " \
                "so the app would crash at launch in Release builds."
        end
        File.write(script_path, script.sub(anchor) { "#{embed}#{requirements}#{$&}" })
      end
    end
  end)
end

Pod::Spec.new do |s|
  s.name         = "DatadogSDKReactNative"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "12.0", :tvos => "12.0" }
  s.source       = { :git => "https://github.com/DataDog/dd-sdk-reactnative.git", :tag => "#{s.version}" }


  s.source_files = "ios/Sources/*.{h,m,mm,swift}"

  s.dependency "React-Core"

  # `spm_dependency` cannot be scoped per-platform the way `s.ios.dependency` can, so
  # DatadogWebViewTracking is requested for every platform here. Our Swift sources already
  # guard the import with `#if os(iOS)`, but dd-sdk-ios declares the product for all of its
  # package platforms — building this pod for tvOS through SPM is therefore untested.
  #
  # Note that DatadogInternal is deliberately absent: it is an internal target of
  # dd-sdk-ios, not an exported SPM product, so it cannot be requested here. Making it
  # importable takes an extra search path -- see the FRAMEWORK_SEARCH_PATHS note below.
  spm_dependency(s,
    url: datadog_ios_spm_url,
    requirement: datadog_ios_requirement,
    products: [
      'DatadogCore',
      'DatadogLogs',
      'DatadogTrace',
      'DatadogRUM',
      'DatadogCrashReporting',
      'DatadogFlags',
      'DatadogWebViewTracking'
    ]
  )

  s.test_spec 'Tests' do |test_spec|
    test_spec.source_files = 'ios/Tests/**/*.{swift,json}'
    test_spec.resources = 'ios/Tests/Fixtures'
    test_spec.platforms = { :ios => "13.4", :tvos => "13.4" }
  end

  # DatadogInternal is an internal target of dd-sdk-ios rather than an exported product, so
  # SwiftPM builds it into PackageFrameworks/ instead of emitting a bare .swiftmodule alongside
  # the products. React Native's `spm_dependency` helper only appends the products directory to
  # SWIFT_INCLUDE_PATHS, which leaves the module invisible to the compiler. Our sources import it
  # for AnyEncodable, CoreRegistry, DatadogCoreProtocol and FeatureScope, so add the directory
  # holding the package frameworks explicitly.
  #
  # Note this cannot be written against BUILT_PRODUCTS_DIR: CocoaPods gives every pod target its
  # own CONFIGURATION_BUILD_DIR, so for this target BUILT_PRODUCTS_DIR is
  # <symroot>/<config><platform>/DatadogSDKReactNative, one level below where SwiftPM actually
  # writes PackageFrameworks/. Spelling it as SYMROOT/CONFIGURATION+EFFECTIVE_PLATFORM_NAME
  # matches what `spm_dependency` itself uses for SWIFT_INCLUDE_PATHS.
  #
  # Archive builds lay this out differently: PackageFrameworks/ stays empty and the package
  # frameworks are linked straight into the products directory itself, so search that too.
  datadog_spm_xcconfig = {
    'FRAMEWORK_SEARCH_PATHS' => '$(inherited) "$(SYMROOT)/$(CONFIGURATION)$(EFFECTIVE_PLATFORM_NAME)/PackageFrameworks" "$(SYMROOT)/$(CONFIGURATION)$(EFFECTIVE_PLATFORM_NAME)"'
  }

  xcconfig = datadog_spm_xcconfig.dup

  if ENV['RCT_NEW_ARCH_ENABLED'] == '1'
    xcconfig.merge!({
      "DEFINES_MODULE" => "YES",
      "OTHER_CPLUSPLUSFLAGS" => "-DRCT_NEW_ARCH_ENABLED=1"
    })

    # Assign before install_modules_dependencies: the helper reads the spec's current
    # pod_target_xcconfig, merges React Native's own header search paths and C++ settings into it
    # and assigns the result back, so assigning afterwards would drop everything it added.
    s.pod_target_xcconfig = xcconfig

    # install_modules_dependencies is only available on RN >= 0.71
    if respond_to?(:install_modules_dependencies, true)
      install_modules_dependencies(s)
    else
      Pod::UI.warn "Using Datadog React Native SDK with new architecture on RN < 0.71 is discouraged and not officially supported."
    end
  else
    s.pod_target_xcconfig = xcconfig
  end
end
