
// 이 파일을 수정하여 당신의 Firebase 프로젝트 설정으로 교체해주세요.
// Firebase 콘솔에서 당신의 웹 앱 설정을 찾을 수 있습니다.

// Firebase SDK에서 필요한 함수들을 가져옵니다.
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// TODO: 이 곳에 당신의 Firebase 웹 앱 설정 정보를 붙여넣으세요.
const firebaseConfig = {
  apiKey: "여기에_API_키를_입력하세요",
  authDomain: "프로젝트ID.firebaseapp.com",
  projectId: "프로젝트ID",
  storageBucket: "프로젝트ID.appspot.com",
  messagingSenderId: "발신자ID",
  appId: "앱ID"
};

// Firebase 앱을 초기화합니다.
const app = initializeApp(firebaseConfig);

// Firestore 데이터베이스 객체를 가져와서 다른 파일에서 사용할 수 있도록 내보냅니다(export).
export const db = getFirestore(app);
