package com.pku.course

import android.app.Activity
import android.content.ClipData
import android.content.Intent
import android.webkit.MimeTypeMap
import androidx.core.content.FileProvider
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.Plugin
import java.io.File

@InvokeArg
class OpenDownloadedFileArgs {
    lateinit var path: String
}

@TauriPlugin
class OpenDownloadedFilePlugin(private val activity: Activity) : Plugin(activity) {
    @Command
    fun openDownloadedFile(invoke: Invoke) {
        try {
            val hostActivity = activity
            val appContext = hostActivity.applicationContext
            val args = invoke.parseArgs(OpenDownloadedFileArgs::class.java)
            val file = File(args.path)
            if (!file.exists()) {
                invoke.reject("File does not exist: ${args.path}")
                return
            }

            val uri = FileProvider.getUriForFile(
                hostActivity,
                "${appContext.packageName}.fileprovider",
                file
            )
            val extension = file.extension.lowercase()
            val mimeType = appContext.contentResolver.getType(uri)
                ?: MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension)
                ?: "*/*"

            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, mimeType)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION)
                clipData = ClipData.newRawUri(file.name, uri)
            }

            val chooser = Intent.createChooser(intent, null).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION)
                clipData = ClipData.newRawUri(file.name, uri)
            }

            appContext.startActivity(chooser)
            invoke.resolve()
        } catch (ex: Exception) {
            invoke.reject(ex.message)
        }
    }
}
