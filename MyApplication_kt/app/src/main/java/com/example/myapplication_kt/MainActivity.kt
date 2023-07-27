package com.example.myapplication_kt

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity


class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

//        ------------------ Find ID ------------------
        val myText:TextView = findViewById(R.id.ID_Textview_1)
        val loginBt:Button = findViewById(R.id.bt_Login)
        val signUp:Button = findViewById(R.id.bt_SignUp)

        myText.text = "start Android by Kt"
        
        loginBt.setOnClickListener {
            Toast.makeText(this, "토스트 메시지 - LOGIN Click", Toast.LENGTH_SHORT).show()
        }


        signUp.setOnClickListener{
            Toast.makeText(this, "토스트 메시지 - signUp", Toast.LENGTH_SHORT).show()
        }

        intent?.let{
            handleDeepLinkData(it)
        }

    }

    private fun handleDeepLinkData(intent: Intent){
        val data : Uri? = intent.data
    }
}

