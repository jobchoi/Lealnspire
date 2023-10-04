package com.example.myapplication_kt

import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.provider.MediaStore
import android.util.Log
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import android.Manifest
import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager

public class MainActivity : AppCompatActivity(),SensorEventListener {

    private lateinit var sensorManager: SensorManager
    private var accelerometer: Sensor? = null
    private var gyroscope: Sensor? = null
    private lateinit var gSensorValueTextView: TextView
    private lateinit var aSensorValueTextView: TextView


    companion object{
        const val TAKE_PICTURE = 1
        const val REQUEST_CAMERA_PERMISSION_CODE = 1001
    }

   
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)




//        ------------------ Find ID ------------------
        val myText:TextView = findViewById(R.id.ID_Textview_1)
        val loginBt:Button = findViewById(R.id.bt_Login)
        val signUp:Button = findViewById(R.id.bt_SignUp)
        val phto_bt:Button = findViewById(R.id.bt_camera)

        gSensorValueTextView = findViewById(R.id.getGSensor)
        aSensorValueTextView = findViewById(R.id.getASensor)

//        val CAMERA = arrayOf(Manifest.permission.CAMERA)

        // SensorManager 초기화
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        // 가속도 센서와 자이로 센서 초기화
        accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        gyroscope = sensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE)

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

        val hasCameraPermission = ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        if (!hasCameraPermission) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.CAMERA), REQUEST_CAMERA_PERMISSION_CODE)
        }

        phto_bt.setOnClickListener{v->  
            when(v.id){
                R.id.bt_camera->{
                    val camIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
                    androidx.fragment.app.FragmentActivity()
                    callMyCamera()
                    Toast.makeText(this, "토스트 메시지 - Camera Call after", Toast.LENGTH_SHORT).show()
                    Log.d("CAM_START", "CAM_START called")

                }
            }
        }


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

    override fun onResume() {
        super.onResume()
        accelerometer?.let {
            sensorManager.registerListener(sensorEventListener, it, SensorManager.SENSOR_DELAY_NORMAL)
        }
        gyroscope?.let {
            sensorManager.registerListener(sensorEventListener, it, SensorManager.SENSOR_DELAY_NORMAL)
        }
    }




    private fun handleDeepLinkData(intent: Intent){
        val data : Uri? = intent.data
    }
    private fun callMyCamera(){
//        val imgCap = ImageCapture.Builder().build()
        val my_previewView = findViewById<PreviewView>(R.id.previewView)

        if (ContextCompat.checkSelfPermission(this,Manifest.permission.CAMERA
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.CAMERA),
                REQUEST_CAMERA_PERMISSION_CODE
            )
        }



        val cameraProviderFuture = ProcessCameraProvider.getInstance(this)
        cameraProviderFuture.addListener({
            val cameraProvider: ProcessCameraProvider = cameraProviderFuture.get()
            val preview = Preview.Builder().build().also {
                it.setSurfaceProvider(my_previewView.surfaceProvider)
            }

            val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

            try {
                cameraProvider.unbindAll()
                cameraProvider.bindToLifecycle(this, cameraSelector, preview)
            } catch (exc: Exception) {
                Log.e("CameraXApp", "Use case binding failed", exc)
            }

        }, ContextCompat.getMainExecutor(this))
    }
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        when (requestCode) {
            REQUEST_CAMERA_PERMISSION_CODE -> {
                if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                    // 권한이 허용됨
                } else {
                    // 권한이 거부됨
                }
            }
        }
    }
    // SENSOR START
    private val sensorEventListener = object : SensorEventListener {
        override fun onAccuracyChanged(sensor: Sensor, accuracy: Int) {
            // 센서의 정확도가 변경될 때 호출됩니다.

        }

        override fun onSensorChanged(event: SensorEvent) {

            var formatted_G_X = ""
            var formatted_G_Y = ""
            var formatted_G_Z = ""

            var formatted_A_Z = ""
            var formatted_A_X = ""
            var formatted_A_Y = ""

            when (event.sensor.type) {
                Sensor.TYPE_ACCELEROMETER -> {
                    val ax = event.values[0]
                    val ay = event.values[1]
                    val az = event.values[2]

                   formatted_A_X = String.format("%.2f", ax)
                   formatted_A_Y = String.format("%.2f", ay)
                   formatted_A_Z = String.format("%.2f", az)
                }
                Sensor.TYPE_GYROSCOPE -> {
                    val gx = event.values[0]
                    val gy = event.values[1]
                    val gz = event.values[2]

                    formatted_G_X = String.format("%.2f", gx)
                    formatted_G_Y = String.format("%.2f", gy)
                    formatted_G_Z = String.format("%.2f", gz)
                }
            }
            // textView에서 값 확인
            gSensorValueTextView.text = "X: $formatted_G_X  Y: $formatted_G_Y  Z: $formatted_G_Z"
            aSensorValueTextView.text = "X: $formatted_A_X  Y: $formatted_A_Y  Z: $formatted_A_Z"
        }
    }

    override fun onSensorChanged(event: SensorEvent?) {
        TODO("Not yet implemented")
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        TODO("Not yet implemented")
    }
    // SENSOR END
}



