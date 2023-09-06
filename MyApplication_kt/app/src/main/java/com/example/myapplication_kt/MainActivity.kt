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

class MainActivity : AppCompatActivity(),SensorEventListener {

    private  lateinit var sensorManager:SensorManager
    private var accelerometer: Sensor? = null

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

//        val CAMERA = arrayOf(Manifest.permission.CAMERA)

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

        phto_bt.setOnClickListener{v->
            when(v.id){
                R.id.bt_camera->{
                    val camIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
                    androidx.fragment.app.FragmentActivity()
                    CallCamera()
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

        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)

    }

    override fun onResume() {
        super.onResume()
        accelerometer?.let {
            sensorManager.registerListener(sensorListener, it, SensorManager.SENSOR_DELAY_NORMAL)
        }
    }

    private val sensorListener = object : SensorEventListener {
        override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
            when(accuracy){
                SensorManager.SENSOR_STATUS_UNRELIABLE -> {                }
                SensorManager.SENSOR_STATUS_ACCURACY_LOW -> {                }
                SensorManager.SENSOR_STATUS_ACCURACY_MEDIUM -> {}
                SensorManager.SENSOR_STATUS_ACCURACY_HIGH -> {}
            }
        }

        override fun onSensorChanged(event: SensorEvent?) {
            event?.let {
                when (event.sensor.type) {
                    Sensor.TYPE_ACCELEROMETER -> {
                        val ax = event.values[0]  // X축 가속도
                        val ay = event.values[1]  // Y축 가속도
                        val az = event.values[2]  // Z축 가속도
                    }
                    // 필요한 경우, 다른 센서 유형에 대한 처리도 추가할 수 있습니다.
                }
            }
        }
    }




    private fun handleDeepLinkData(intent: Intent){
        val data : Uri? = intent.data
    }
    private fun CallCamera(){
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



    override fun onPause() {
        super.onPause()
        // Lisener 해제 중.
        sensorManager.unregisterListener(this)

    }

    override fun onSensorChanged(p0: SensorEvent?) {
        p0?.let {
            if(it.sensor.type == Sensor.TYPE_ACCELEROMETER){
                val ax = it.values[0]
                val ay = it.values[1]
                val az = it.values[2]

                val message = "X: $ax, Y: $ay, Z: $az"

                Log.d("G_TEST", "onSensorChanged called")

                Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
                runOnUiThread{
                    Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
                }
            }
        }

    }

    override fun onAccuracyChanged(p0: Sensor?, p1: Int) {
        TODO("Not yet implemented")
    }
}



