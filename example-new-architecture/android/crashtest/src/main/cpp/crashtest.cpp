#include <jni.h>

extern "C" JNIEXPORT void JNICALL
Java_com_ddsdkreactnativeexample_CrashTestSDK_crashNow(
        JNIEnv *env,
        jobject /* this */) {
    int *p = nullptr;
    *p = 999;  // Boom
}
