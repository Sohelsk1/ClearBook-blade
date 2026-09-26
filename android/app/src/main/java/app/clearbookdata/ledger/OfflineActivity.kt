package app.clearbookdata.ledger

import android.content.Intent
import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat

/** Shown when there is no network. The ledger is not cached on the device. */
class OfflineActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        setContentView(R.layout.activity_offline)
        val root = findViewById<View>(R.id.offline_root)
        ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            view.setPadding(bars.left + 24, bars.top + 24, bars.right + 24, bars.bottom + 24)
            insets
        }
        findViewById<View>(R.id.offline_retry).setOnClickListener {
            startActivity(Intent(this, ClearbookLaunchActivity::class.java))
            finish()
        }
    }
}
