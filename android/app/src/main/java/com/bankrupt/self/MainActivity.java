package com.bankrupt.self;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        WebView myWebView = (WebView) findViewById(R.id.webview);

        // 웹뷰 설정
        WebSettings webSettings = myWebView.getSettings();
        webSettings.setJavaScriptEnabled(true); // 자바스크립트 허용
        webSettings.setDomStorageEnabled(true); // 로컬 스토리지 사용 허용

        // 웹뷰가 새 창을 열지 않고 현재 창에서 URL을 로드하도록 설정
        myWebView.setWebViewClient(new WebViewClient());
        
        // 여기에 당신의 웹사이트 URL을 입력하세요.
        // my-bankruptcy-app.web.app 부분이 당신의 Firebase 프로젝트 ID와 일치해야 합니다.
        myWebView.loadUrl("https://my-bankruptcy-app.web.app");
    }
}
