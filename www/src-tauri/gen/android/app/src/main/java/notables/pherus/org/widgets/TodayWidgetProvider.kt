package notables.pherus.org.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject
import notables.pherus.org.R
import java.io.File

/**
 * The Notables "Today" home-screen widget: the next plans and pinned notes.
 *
 * The app's Rust core writes widgets/today.json into its data folder
 * whenever notes or plans change (src/widgets.rs); this reads it. Tapping
 * a row opens that place in the app through a notables:// link.
 */
class TodayWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        val snapshot = readSnapshot(context)
        for (id in ids) manager.updateAppWidget(id, render(context, snapshot))
    }

    private fun render(context: Context, snapshot: JSONObject?): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.widget_today)
        val labels = snapshot?.optJSONObject("labels")
        views.setTextViewText(R.id.widget_heading, labels?.optString("upNext") ?: "Today")
        views.setOnClickPendingIntent(R.id.widget_root, openLink(context, "notables://home", 0))

        val agenda = snapshot?.optJSONArray("agenda")
        val rows = listOf(
            Triple(R.id.agenda_row_1, R.id.agenda_title_1, R.id.agenda_when_1),
            Triple(R.id.agenda_row_2, R.id.agenda_title_2, R.id.agenda_when_2),
            Triple(R.id.agenda_row_3, R.id.agenda_title_3, R.id.agenda_when_3),
        )
        rows.forEachIndexed { index, (row, title, whenView) ->
            val item = agenda?.optJSONObject(index)
            if (item == null) {
                views.setViewVisibility(row, View.GONE)
            } else {
                views.setViewVisibility(row, View.VISIBLE)
                views.setTextViewText(title, item.optString("title"))
                views.setTextViewText(whenView, item.optString("when"))
                views.setOnClickPendingIntent(row, openLink(context, item.optString("link"), index + 1))
            }
        }
        val empty = agenda == null || agenda.length() == 0
        views.setViewVisibility(R.id.agenda_empty, if (empty) View.VISIBLE else View.GONE)
        views.setTextViewText(R.id.agenda_empty, labels?.optString("nothingPlanned") ?: "")

        val pinned = snapshot?.optJSONArray("pinned")
        val first = pinned?.optJSONObject(0)
        if (first == null) {
            views.setViewVisibility(R.id.pinned_row, View.GONE)
        } else {
            views.setViewVisibility(R.id.pinned_row, View.VISIBLE)
            views.setTextViewText(R.id.pinned_title, first.optString("title"))
            views.setOnClickPendingIntent(R.id.pinned_row, openLink(context, first.optString("link"), 10))
        }
        return views
    }

    private fun openLink(context: Context, link: String, requestCode: Int): PendingIntent {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(link)).setPackage(context.packageName)
        return PendingIntent.getActivity(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    companion object {
        /** Where the Rust core may have written the snapshot, newest layout first. */
        private fun candidates(context: Context): List<File> = listOf(
            File(context.dataDir, "widgets/today.json"),
            File(context.filesDir, "widgets/today.json"),
            File(context.dataDir, "${context.packageName}/widgets/today.json"),
        )

        fun readSnapshot(context: Context): JSONObject? =
            candidates(context)
                .filter { it.isFile }
                .maxByOrNull { it.lastModified() }
                ?.let { runCatching { JSONObject(it.readText()) }.getOrNull() }

        /** Redraws every Notables widget now, e.g. when the app goes to the background. */
        fun refreshAll(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, TodayWidgetProvider::class.java))
            if (ids.isNotEmpty()) TodayWidgetProvider().onUpdate(context, manager, ids)
        }
    }
}
