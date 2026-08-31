/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import React from 'react';
// Alias react-native's Text so the SVG Text component keeps its real name.
// The Babel plugin converts JSX element names via convertAttributeCasing — 'Text' → 'text'
// which is in svgElements, but 'SvgText' → 'svgText' which is not, producing a
// mismatched opening/closing tag pair that breaks svgo.
import { ScrollView, Text as RNText, View, StyleSheet, Animated } from 'react-native';
import {
    Svg, Circle, Rect, Ellipse, Polygon, Path, Line, Polyline,
    G, Defs, LinearGradient, RadialGradient, Stop, ClipPath,
    Text
} from 'react-native-svg';

import {
    SessionReplayView,
    ImagePrivacyLevel
} from '@datadog/mobile-react-native-session-replay';

import StarSvg from './assets/star.svg';
import { HeartIcon, ShieldIcon } from './assets/icons';
// Aliased via the 'module-resolver' babel plugin (see benchmarks/babel.config.js) —
// tests that buildSvgMap resolves aliased local SVG imports (RUM-12185).
import AliasedStarSvg from '@assets/star.svg';
// H2/H3/H4 alias into @react-native/debugger-frontend -- a real npm
// dependency (not a workspace symlink), so the Babel plugin's node_modules
// exclusion applies to it, meaning localSvgMap/pathAliasResolver is the
// only thing that can make these show up wrapped in Session Replay (see
// babel.config.js for why this matters).
// H2: alias resolves straight to a file -- specifier has no '.svg' extension.
import CheckmarkLogo from '@heart-logo';
// H3: alias substitute is an absolute filesystem path.
import AbsoluteAliasedLock from '@absoluteAssets/lock.svg';
// H4: alias configured in metro.config.js's resolver.extraNodeModules.
import MetroAliasedGear from 'metroAssets/gear-filled.svg';

// Module-level const used in Case D1 to test findIdentifierInScope
const BADGE_SIZE = 72;

// Used in Group I. `Animated.createAnimatedComponent` is core React Native and needs no
// extra dependency to produce a capitalized custom component whose first-letter-lowercased
// tag name ('AnimatedPath' -> 'animatedPath') is not in svgElements.
const AnimatedPath = Animated.createAnimatedComponent(Path);

// ─────────────────────────────────────────────────────────────
// GROUP A — Basic static shapes
// All attributes are string literals. All should appear in replay.
// ─────────────────────────────────────────────────────────────

/** A1: Simple filled circle */
function BlueCircle() {
    return (
        <Svg width="64" height="64" viewBox="0 0 64 64">
            <Circle cx="32" cy="32" r="28" fill="#3498db" />
        </Svg>
    );
}

/** A2: Rounded rectangle */
function RedRoundedRect() {
    return (
        <Svg width="80" height="50" viewBox="0 0 80 50">
            <Rect x="4" y="4" width="72" height="42" rx="10" ry="10" fill="#e74c3c" />
        </Svg>
    );
}

/** A3: Ellipse */
function GreenEllipse() {
    return (
        <Svg width="80" height="48" viewBox="0 0 80 48">
            <Ellipse cx="40" cy="24" rx="36" ry="20" fill="#2ecc71" />
        </Svg>
    );
}

/** A4: Polygon — 5-pointed star (10 vertices: 5 outer + 5 inner) */
function OrangeStar() {
    return (
        <Svg width="64" height="64" viewBox="0 0 64 64">
            <Polygon
                points="32,4 39,24 60,24 44,38 50,58 32,46 14,58 20,38 4,24 25,24"
                fill="#f39c12"
            />
        </Svg>
    );
}

/** A5: Path — chevron/arrow */
function PurpleArrow() {
    return (
        <Svg width="64" height="64" viewBox="0 0 64 64">
            <Path
                d="M12 32 L44 32 M32 18 L48 32 L32 46"
                stroke="#9b59b6"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
        </Svg>
    );
}

/** A6: Line and Polyline */
function TealLines() {
    return (
        <Svg width="80" height="56" viewBox="0 0 80 56">
            <Line x1="8" y1="28" x2="72" y2="28" stroke="#1abc9c" strokeWidth="3" strokeLinecap="round" />
            <Polyline
                points="8,48 24,16 40,40 56,16 72,48"
                stroke="#16a085"
                strokeWidth="3"
                fill="none"
                strokeLinejoin="round"
            />
        </Svg>
    );
}

// ─────────────────────────────────────────────────────────────
// GROUP B — SVG features (defs, gradients, groups, text, clip)
// All static. All should appear in replay.
// ─────────────────────────────────────────────────────────────

/** B1: Linear gradient via Defs */
function GradientRect() {
    return (
        <Svg width="100" height="56" viewBox="0 0 100 56">
            <Defs>
                <LinearGradient id="grad1" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor="#3498db" stopOpacity="1" />
                    <Stop offset="1" stopColor="#9b59b6" stopOpacity="1" />
                </LinearGradient>
            </Defs>
            <Rect x="4" y="4" width="92" height="48" rx="8" fill="url(#grad1)" />
        </Svg>
    );
}

/** B2: Radial gradient */
function RadialGlow() {
    return (
        <Svg width="64" height="64" viewBox="0 0 64 64">
            <Defs>
                <RadialGradient id="glow1" cx="0.5" cy="0.5" r="0.5">
                    <Stop offset="0" stopColor="#f1c40f" stopOpacity="1" />
                    <Stop offset="1" stopColor="#e67e22" stopOpacity="1" />
                </RadialGradient>
            </Defs>
            <Circle cx="32" cy="32" r="28" fill="url(#glow1)" />
        </Svg>
    );
}

/** B3: Group — traffic light */
function TrafficLight() {
    return (
        <Svg width="36" height="96" viewBox="0 0 36 96">
            <Rect x="4" y="4" width="28" height="88" rx="6" fill="#2c3e50" />
            <Circle cx="18" cy="22" r="9" fill="#e74c3c" />
            <Circle cx="18" cy="48" r="9" fill="#f39c12" />
            <Circle cx="18" cy="74" r="9" fill="#2ecc71" />
        </Svg>
    );
}

/** B4: ClipPath — clipped circle */
function ClippedCircle() {
    return (
        <Svg width="64" height="64" viewBox="0 0 64 64">
            <Defs>
                <ClipPath id="clip1">
                    <Rect x="0" y="0" width="40" height="64" />
                </ClipPath>
            </Defs>
            <Circle cx="32" cy="32" r="28" fill="#e74c3c" clipPath="url(#clip1)" />
            <Circle cx="32" cy="32" r="28" fill="none" stroke="#c0392b" strokeWidth="3" />
        </Svg>
    );
}

/** B5: SVG Text element */
function SvgLabel() {
    return (
        <Svg width="120" height="48" viewBox="0 0 120 48">
            <Rect x="0" y="0" width="120" height="48" fill="#2c3e50" rx="6" />
            <Text
                x="60"
                y="32"
                textAnchor="middle"
                fill="white"
                fontSize="20"
                fontWeight="bold"
            >
                DD
            </Text>
        </Svg>
    );
}

// ─────────────────────────────────────────────────────────────
// GROUP C — Transform attributes
// translateX/Y, rotate are converted from RN props to SVG transform.
// ─────────────────────────────────────────────────────────────

/** C1: Group with translateX/Y (RN-style transform props) */
function TranslatedGroup() {
    return (
        <Svg width="80" height="80" viewBox="0 0 80 80">
            <Rect x="0" y="0" width="80" height="80" fill="#ecf0f1" />
            {/* G with RN transform props — converted to SVG transform="translate(40,40)" */}
            <G translateX="40" translateY="40">
                <Rect x="-24" y="-16" width="48" height="32" rx="4" fill="#e74c3c" />
            </G>
        </Svg>
    );
}

/** C2: Rotated shape via rotate prop */
function RotatedDiamond() {
    return (
        <Svg width="64" height="64" viewBox="0 0 64 64">
            <G translateX="32" translateY="32" rotate="45">
                <Rect x="-18" y="-18" width="36" height="36" fill="#9b59b6" rx="4" />
            </G>
        </Svg>
    );
}

/** C3: Scaled element */
function ScaledStar() {
    return (
        <Svg width="80" height="80" viewBox="0 0 80 80">
            <G translateX="40" translateY="40" scaleX="0.6" scaleY="0.6">
                <Polygon
                    points="0,-36 10,-12 36,-12 16,4 24,30 0,16 -24,30 -16,4 -36,-12 -10,-12"
                    fill="#f39c12"
                />
            </G>
        </Svg>
    );
}

// ─────────────────────────────────────────────────────────────
// GROUP D — Dimension handling
// ─────────────────────────────────────────────────────────────

/** D1: Module-level const dimensions — resolved by findIdentifierInScope */
function ConstSizedBadge() {
    return (
        <Svg width={BADGE_SIZE} height={BADGE_SIZE} viewBox="0 0 72 72">
            <Circle cx="36" cy="36" r="30" fill="#27ae60" />
            <Path
                d="M20 36 L30 46 L52 26"
                stroke="white"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
        </Svg>
    );
}

/** D2: ViewBox only — no explicit width/height. Native layer injects them from view bounds. */
function ViewBoxOnlyIcon() {
    return (
        <Svg viewBox="0 0 48 48" style={{ width: 64, height: 64 }}>
            <Circle cx="24" cy="24" r="20" fill="#8e44ad" />
            <Rect x="16" y="10" width="16" height="28" rx="3" fill="white" />
        </Svg>
    );
}

// ─────────────────────────────────────────────────────────────
// GROUP E — Dynamic props (known limitation, deferred to a follow-up PR)
// A property value that can't be resolved at build time (e.g. fill={color}) is left as-is
// rather than stripped or guessed at — stripping/altering properties can change an SVG's
// bounds in ways that are hard to reason about. Left in place, it makes the generated markup
// invalid, svgo fails to parse it, and the whole <Svg> is skipped — same graceful-failure path
// as before any of this work, just no longer reachable for unsupported *tags* (see Group I).
// A follow-up PR will pass these runtime values through the native view to fill in natively.
// ─────────────────────────────────────────────────────────────

/** E1: Dynamic fill on root element — EXPECTED: absent from replay entirely */
function DynamicRootFill({ accentColor }: { accentColor: string }) {
    return (
        <Svg width="64" height="64" viewBox="0 0 64 64" fill={accentColor}>
            <Rect x="8" y="8" width="48" height="48" rx="8" />
        </Svg>
    );
}

/** E2: Dynamic fill on child — EXPECTED: absent from replay entirely */
function DynamicChildFill({ iconColor }: { iconColor: string }) {
    return (
        <Svg width="64" height="64" viewBox="0 0 64 64">
            <Circle cx="32" cy="32" r="28" fill={iconColor} />
            <Path d="M22 32 L30 40 L42 24" stroke="white" strokeWidth="4" strokeLinecap="round" fill="none" />
        </Svg>
    );
}

/** E3: Dynamic stroke and strokeWidth — EXPECTED: absent from replay entirely */
function DynamicStrokeRect({ borderColor, borderWidth }: { borderColor: string; borderWidth: number }) {
    return (
        <Svg width="80" height="56" viewBox="0 0 80 56">
            <Rect
                x="4"
                y="4"
                width="72"
                height="48"
                rx="8"
                fill="#ecf0f1"
                stroke={borderColor}
                strokeWidth={borderWidth}
            />
        </Svg>
    );
}

/** E4: Mix of static fill + dynamic opacity — EXPECTED: absent from replay entirely */
function DynamicOpacityCircle({ fadeLevel }: { fadeLevel: number }) {
    return (
        <Svg width="64" height="64" viewBox="0 0 64 64">
            <Circle cx="32" cy="32" r="28" fill="#e74c3c" opacity={fadeLevel} />
        </Svg>
    );
}

// ─────────────────────────────────────────────────────────────
// GROUP F — File imports
// LocalSvgHandler reads the SVG file from disk (Fix 2, 3, 4).
// ─────────────────────────────────────────────────────────────

/** F1: Default import of a local .svg file */
function LocalStarImport() {
    return <StarSvg width={64} height={64} />;
}

/** F2: Named import from barrel file (export { default as HeartIcon })
 *  Tests Fix 6: ExportNamedDeclaration uses spec.exported.name, not spec.local.name */
function BarrelHeartImport() {
    return <HeartIcon width={64} height={64} />;
}

/** F3: Second barrel export — ShieldIcon */
function BarrelShieldImport() {
    return <ShieldIcon width={56} height={62} />;
}

// ─────────────────────────────────────────────────────────────
// GROUP H — Aliased import (RUM-12185)
// Same star.svg as F1, but imported via the '@assets' alias configured
// through babel-plugin-module-resolver in babel.config.js.
// ─────────────────────────────────────────────────────────────

/** H1: Default import of a local .svg file via an aliased path */
function AliasedStarImport() {
    return <AliasedStarSvg width={64} height={64} />;
}

/** H2: Alias substitute maps straight to a file, so the specifier itself
 *  ('@heart-logo') carries no '.svg' extension at all. */
function AliasedExtensionlessImport() {
    return <CheckmarkLogo width={40} height={40} />;
}

/** H3: Alias substitute is an absolute filesystem path rather than one
 *  relative to the importing file. */
function AbsoluteAliasImport() {
    return <AbsoluteAliasedLock width={40} height={40} />;
}

/** H4: Alias configured in metro.config.js's resolver.extraNodeModules,
 *  rather than via babel-plugin-module-resolver or tsconfig.json. */
function MetroExtraNodeModulesImport() {
    return <MetroAliasedGear width={40} height={40} />;
}

// ─────────────────────────────────────────────────────────────
// GROUP I — Unsupported nested elements
// AnimatedPath isn't a recognized SVG tag, so it's now spliced out of the tree
// instead of breaking generation for the whole parent <Svg> (see RNSvgHandler).
// ─────────────────────────────────────────────────────────────

/**
 * I1: The checkmark stroke uses AnimatedPath instead of Path. SHOULD appear in replay
 * as the green circle background WITHOUT the white checkmark — the unsupported
 * AnimatedPath element is removed, but the rest of the SVG is still captured. Compare
 * against I2: same circle, but I2 additionally shows the checkmark since it uses a
 * plain, supported <Path>.
 */
function BrokenAnimatedCheckmark() {
    const opacity = React.useRef(new Animated.Value(1)).current;
    return (
        <Svg width="64" height="64" viewBox="0 0 64 64">
            <Circle cx="32" cy="32" r="28" fill="#27ae60" />
            <AnimatedPath
                d="M18 32 L28 42 L46 20"
                stroke="white"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                style={{ opacity }}
            />
        </Svg>
    );
}

/**
 * I2: Control — identical icon to I1, but the checkmark uses plain <Path>. SHOULD
 * appear in replay. Compare directly against I1: same shape, only the wrapper
 * component differs.
 */
function ControlCheckmark() {
    return (
        <Svg width="64" height="64" viewBox="0 0 64 64">
            <Circle cx="32" cy="32" r="28" fill="#27ae60" />
            <Path
                d="M18 32 L28 42 L46 20"
                stroke="white"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
        </Svg>
    );
}

// ─────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────

type CaseProps = {
    label: string;
    sublabel?: string;
    children: React.ReactNode;
};

function Case({ label, sublabel, children }: CaseProps) {
    return (
        <View style={styles.case}>
            <View style={styles.caseContent}>{children}</View>
            <View style={styles.caseMeta}>
                <RNText style={styles.caseLabel}>{label}</RNText>
                {sublabel ? <RNText style={styles.caseSublabel}>{sublabel}</RNText> : null}
            </View>
        </View>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <View style={styles.section}>
            <RNText style={styles.sectionTitle}>{title}</RNText>
            <View style={styles.sectionGrid}>{children}</View>
        </View>
    );
}

export default function SvgTestCases() {
    return (
        <ScrollView contentContainerStyle={styles.container}>
            <RNText style={styles.heading}>Session Replay SVG Test Screen</RNText>
            <RNText style={styles.subtitle}>
                All cases in Groups A–D should appear in replay.{'\n'}
                Group E: known limitation — absent from replay entirely (see comment).{'\n'}
                Group F: appears after buildSvgMap fixes.{'\n'}
                Group G: privacy overrides — verify masking behavior in replay.{'\n'}
                Group H: aliased imports — resolved via module-resolver, absolute-path, and metro.config.js aliases.{'\n'}
                Group I: I1 shows circle only (checkmark removed), I2 shows circle + checkmark.
            </RNText>

            <Section title="A — Basic static shapes">
                <Case label="A1 Circle" sublabel="fill=blue">
                    <BlueCircle />
                </Case>
                <Case label="A2 Rect" sublabel="rx/ry rounded">
                    <RedRoundedRect />
                </Case>
                <Case label="A3 Ellipse" sublabel="rx≠ry">
                    <GreenEllipse />
                </Case>
                <Case label="A4 Polygon" sublabel="10-point star">
                    <OrangeStar />
                </Case>
                <Case label="A5 Path" sublabel="stroke, no fill">
                    <PurpleArrow />
                </Case>
                <Case label="A6 Line+Polyline" sublabel="two stroked paths">
                    <TealLines />
                </Case>
            </Section>

            <Section title="B — SVG features (defs, gradient, clip, text)">
                <Case label="B1 LinearGradient" sublabel="blue→purple">
                    <GradientRect />
                </Case>
                <Case label="B2 RadialGradient" sublabel="yellow→orange">
                    <RadialGlow />
                </Case>
                <Case label="B3 Group" sublabel="traffic light">
                    <TrafficLight />
                </Case>
                <Case label="B4 ClipPath" sublabel="half-circle clipped">
                    <ClippedCircle />
                </Case>
                <Case label="B5 SvgText" sublabel="text element">
                    <SvgLabel />
                </Case>
            </Section>

            <Section title="C — Transform attributes (RN props → SVG transform)">
                <Case label="C1 translateX/Y" sublabel="centered rect">
                    <TranslatedGroup />
                </Case>
                <Case label="C2 rotate=45" sublabel="diamond">
                    <RotatedDiamond />
                </Case>
                <Case label="C3 scaleX/Y=0.6" sublabel="scaled star">
                    <ScaledStar />
                </Case>
            </Section>

            <Section title="D — Dimension handling">
                <Case label="D1 const BADGE_SIZE" sublabel="findIdentifierInScope">
                    <ConstSizedBadge />
                </Case>
                <Case label="D2 viewBox only" sublabel="native injects w/h">
                    <ViewBoxOnlyIcon />
                </Case>
            </Section>

            <Section title="E — Dynamic props (known limitation, see comment — deferred to a follow-up PR)">
                <Case label="E1 fill={accentColor}" sublabel="expect: absent entirely">
                    <DynamicRootFill accentColor="#3498db" />
                </Case>
                <Case label="E2 fill={iconColor}" sublabel="expect: absent entirely">
                    <DynamicChildFill iconColor="#e74c3c" />
                </Case>
                <Case label="E3 stroke={color}" sublabel="expect: absent entirely">
                    <DynamicStrokeRect borderColor="#9b59b6" borderWidth={4} />
                </Case>
                <Case label="E4 opacity={fadeLevel}" sublabel="expect: absent entirely">
                    <DynamicOpacityCircle fadeLevel={0.8} />
                </Case>
            </Section>

            <Section title="F — File imports (Fixes 2, 3, 4, 6)">
                <Case label="F1 default import" sublabel="star.svg">
                    <LocalStarImport />
                </Case>
                <Case label="F2 barrel HeartIcon" sublabel="export { default as HeartIcon }">
                    <BarrelHeartImport />
                </Case>
                <Case label="F3 barrel ShieldIcon" sublabel="export { default as ShieldIcon }">
                    <BarrelShieldImport />
                </Case>
            </Section>

            <Section title="H — Aliased import (RUM-12185)">
                <Case label="H1 module-resolver alias" sublabel="@assets/star.svg">
                    <AliasedStarImport />
                </Case>
                <Case label="H2 extensionless alias" sublabel="@heart-logo → checkmark.svg (node_modules)">
                    <AliasedExtensionlessImport />
                </Case>
                <Case label="H3 absolute-path alias" sublabel="@absoluteAssets/lock.svg (node_modules)">
                    <AbsoluteAliasImport />
                </Case>
                <Case label="H4 metro.config.js alias" sublabel="metroAssets/gear-filled.svg (node_modules)">
                    <MetroExtraNodeModulesImport />
                </Case>
            </Section>

            {/* ─── GROUP G — Privacy interaction ─── */}
            {/*
              These cases test whether the native SDK's view-level privacy mechanism
              (DdPrivacyView view tags / SessionReplayPrivacyOverrides) correctly
              interacts with SVG wireframes produced by the custom mapper/recorder.

              The Babel plugin wraps each SVG in SessionReplayView.Privacy (no imagePrivacy
              set — inherits session level). The outer wrappers here set explicit per-view
              overrides. Whether those cascade to the inner SVG wireframe depends on the
              native SDK's privacy propagation behaviour.

              Expected results are annotated on each case so you can verify in replay.
            */}
            <Section title="G — Privacy interaction (verify in replay)">
                {/* G1: MaskNone override. EXPECTED: SVG content VISIBLE. */}
                <Case label="G1 MaskNone" sublabel="expect: visible">
                    <SessionReplayView.MaskNone>
                        <BlueCircle />
                    </SessionReplayView.MaskNone>
                </Case>

                {/*
                  G2: MaskAll override. EXPECTED: SVG content MASKED. If it still shows,
                  the custom mapper bypasses the view-level privacy override (known gap:
                  SvgViewMapper hardcodes isEmpty:false on Android; SvgViewRecorder never
                  checks imagePrivacy on iOS).
                */}
                <Case label="G2 MaskAll" sublabel="expect: masked">
                    <SessionReplayView.MaskAll>
                        <RedRoundedRect />
                    </SessionReplayView.MaskAll>
                </Case>

                {/* G3: hide=true. EXPECTED: entire view ABSENT from replay (no bounding box). */}
                <Case label="G3 Hide" sublabel="expect: invisible">
                    <SessionReplayView.Hide>
                        <GreenEllipse />
                    </SessionReplayView.Hide>
                </Case>

                {/*
                  G4: imagePrivacy = MASK_NON_BUNDLED_ONLY. SVGs come from assets.bin
                  (bundled), so EXPECTED: VISIBLE.
                */}
                <Case label="G4 NonBundledOnly" sublabel="expect: visible (bundled)">
                    <SessionReplayView.Privacy
                        imagePrivacy={ImagePrivacyLevel.MASK_NON_BUNDLED_ONLY}
                    >
                        <OrangeStar />
                    </SessionReplayView.Privacy>
                </Case>

                {/*
                  G5: nested privacy, inner MaskNone inside outer MaskAll. EXPECTED: MASKED
                  (outer MaskAll wins — inner MaskNone can't "unlock" it).
                */}
                <Case label="G5 Inner MaskNone in outer MaskAll" sublabel="expect: masked">
                    <SessionReplayView.MaskAll>
                        <SessionReplayView.MaskNone>
                            <PurpleArrow />
                        </SessionReplayView.MaskNone>
                    </SessionReplayView.MaskAll>
                </Case>
            </Section>

            <Section title="I — Unsupported nested elements">
                <Case label="I1 AnimatedPath (fixed)" sublabel="expect: circle only, no checkmark">
                    <BrokenAnimatedCheckmark />
                </Case>
                <Case label="I2 Control (plain Path)" sublabel="expect: circle + checkmark">
                    <ControlCheckmark />
                </Case>
            </Section>

            <View style={styles.gapNote}>
                <RNText style={styles.gapTitle}>J — Known gaps (will NOT appear in replay)</RNText>
                <RNText style={styles.gapBody}>
                    • SVG components rendered by node_modules design-system packages are excluded
                    from the Babel transform by design (index.ts:81,128). No DdPrivacyView wrapper
                    is ever created around them.{'\n\n'}
                    • SvgUri is listed in svgSupportedNames but its handler is commented out —
                    &lt;SvgUri uri="..." /&gt; is silently skipped.{'\n\n'}
                    • A property value that can't be resolved at build time (e.g. fill=&#123;color&#125;)
                    makes the whole &lt;Svg&gt; skipped, not just that attribute — see Group E.
                    A follow-up PR will fill these in on the native side instead.
                </RNText>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        paddingBottom: 48,
        gap: 24,
    },
    heading: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 12,
        color: '#555',
        lineHeight: 18,
    },
    section: {
        gap: 8,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#2c3e50',
        borderBottomWidth: 1,
        borderBottomColor: '#bdc3c7',
        paddingBottom: 4,
    },
    sectionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    case: {
        alignItems: 'center',
        gap: 4,
        minWidth: 80,
    },
    caseContent: {
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#ecf0f1',
        borderRadius: 6,
        padding: 4,
        backgroundColor: '#fafafa',
    },
    caseMeta: {
        alignItems: 'center',
        maxWidth: 100,
    },
    caseLabel: {
        fontSize: 11,
        fontWeight: '600',
        textAlign: 'center',
        color: '#2c3e50',
    },
    caseSublabel: {
        fontSize: 10,
        color: '#7f8c8d',
        textAlign: 'center',
    },
    gapNote: {
        backgroundColor: '#fef9e7',
        borderLeftWidth: 4,
        borderLeftColor: '#f39c12',
        padding: 12,
        borderRadius: 4,
        gap: 8,
    },
    gapTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#8e6300',
    },
    gapBody: {
        fontSize: 12,
        color: '#7d6608',
        lineHeight: 18,
    },
});
