package app.clearbookdata.ledger

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat

/**
 * A shared PDF is not uploaded or stored by the app. Clearbook's signed-in
 * page already has the statement picker, and that picker runs inside Chrome.
 */
class ImportHandoffActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        setContentView(R.layout.activity_import_handoff)
        val root = findViewById<View>(R.id.import_root)
        ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            view.setPadding(bars.left + 24, bars.top + 24, bars.right + 24, bars.bottom + 24)
            insets
        }
        findViewById<View>(R.id.import_open).setOnClickListener {
            val launch = Intent(this, ClearbookLaunchActivity::class.java)
                .setAction(Intent.ACTION_VIEW)
                .setData(Uri.parse(ClearbookUrls.TRANSACTIONS))
            startActivity(launch)
            finish()
        }
    }
}
