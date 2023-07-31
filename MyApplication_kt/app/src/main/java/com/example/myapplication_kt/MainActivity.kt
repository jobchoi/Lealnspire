package com.example.myapplication_kt

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log
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
//        ------------------ Find ID ------------------

//        ------------------ deep Link URI data 가져오기 ------------------
        val intent = intent
        val data:Uri? = intent.data
        val deepLinkData:String? = data?.getQueryParameter("data")
//        ------------------ deep Link URI data 가져오기 ------------------
        intent?.data?.let { data->
            val param:String? = data.pathSegments.lastOrNull()
            if(param != null ){
//                Toast.makeText(this, "Parameter : $param", Toast.LENGTH_LONG)
                Log.d("DeepLink ","data :$deepLinkData")
            }
        }

        myText.text = "start Android by Kt"
        
        loginBt.setOnClickListener {
            Toast.makeText(this, "토스트 메시지 - LOGIN Click + data:$deepLinkData", Toast.LENGTH_SHORT).show()
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

