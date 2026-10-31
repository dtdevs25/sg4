package br.com.sg4.mobile.data

import br.com.sg4.mobile.model.LoginRequest
import br.com.sg4.mobile.model.LoginResponse
import br.com.sg4.mobile.model.MobileActionRequest
import br.com.sg4.mobile.model.MobileActionResponse
import br.com.sg4.mobile.model.MobileSyncResponse
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Query
import java.util.concurrent.TimeUnit

interface Sg4ApiService {
    @POST("api/mobile/auth")
    suspend fun login(
        @Body request: LoginRequest
    ): LoginResponse

    @GET("api/mobile/sync")
    suspend fun syncAll(
        @Header("Authorization") bearerToken: String,
        @Query("tecnicoId") tecnicoId: String? = null
    ): MobileSyncResponse

    @POST("api/mobile/action")
    suspend fun submitAction(
        @Header("Authorization") bearerToken: String,
        @Body request: MobileActionRequest
    ): MobileActionResponse

    companion object {
        val moshi: Moshi = Moshi.Builder()
            .add(KotlinJsonAdapterFactory())
            .build()

        fun create(baseUrl: String): Sg4ApiService {
            val withScheme = baseUrl.trim().let {
                if (!it.startsWith("http://") && !it.startsWith("https://")) {
                    "https://$it"
                } else {
                    it
                }
            }
            val normalizedUrl = if (withScheme.endsWith("/")) withScheme else "$withScheme/"
            val logger = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BASIC
            }
            val client = OkHttpClient.Builder()
                .addInterceptor(logger)
                .connectTimeout(20, TimeUnit.SECONDS)
                .readTimeout(25, TimeUnit.SECONDS)
                .writeTimeout(25, TimeUnit.SECONDS)
                .build()

            return Retrofit.Builder()
                .baseUrl(normalizedUrl)
                .client(client)
                .addConverterFactory(MoshiConverterFactory.create(moshi))
                .build()
                .create(Sg4ApiService::class.java)
        }
    }
}

