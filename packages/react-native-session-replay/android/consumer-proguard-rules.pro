-keepclassmembers class com.facebook.drawee.drawable.RoundedBitmapDrawable {
    private android.graphics.Bitmap mBitmap;
}

# ReactTextView.mSpanned is read reflectively (FabricTextViewUtils) to resolve span-based text
# color for RUM Session Replay.
-keepclassmembers class com.facebook.react.views.text.ReactTextView {
    private android.text.Spannable mSpanned;
}

# CustomStyleSpan is looked up by name via Class.forName() and its getFontFamily() method is
# invoked reflectively (LegacyTextViewUtils) to resolve font family for RUM Session Replay.
# The class name and method must both be preserved for this to keep working.
-keep class com.facebook.react.views.text.internal.span.CustomStyleSpan {
    public java.lang.String getFontFamily();
}

# ReactViewBackgroundDrawable (Old Architecture) background/border color fields are read
# reflectively (ReactViewBackgroundDrawableUtils) for RUM Session Replay drawable inspection.
-keepclassmembers class com.facebook.react.views.view.ReactViewBackgroundDrawable {
    private int mColor;
    *** mBorderRGB;
    *** mBorderAlpha;
}

# CSSBackgroundDrawable (New Architecture) background color / computed border radius fields are
# read reflectively (ReactViewBackgroundDrawableUtils) for RUM Session Replay drawable inspection.
-keepclassmembers class com.facebook.react.uimanager.drawable.CSSBackgroundDrawable {
    private int mColor;
    *** mComputedBorderRadius;
}

# BorderRadiusStyle.uniform is read reflectively (ReactViewBackgroundDrawableUtils) on RN versions
# where it is not exposed as a public property.
-keepclassmembers class com.facebook.react.uimanager.style.BorderRadiusStyle {
    *** uniform;
}

# BackgroundDrawable (New Architecture, newer RN) is identified by its fully-qualified class name
# string (ReactViewBackgroundDrawableUtils) and its fields are then read reflectively; the class
# name must be preserved for that string comparison to keep matching at runtime.
-keep class com.facebook.react.uimanager.drawable.BackgroundDrawable {
    *** computedBorderRadius;
    *** backgroundColor;
}
