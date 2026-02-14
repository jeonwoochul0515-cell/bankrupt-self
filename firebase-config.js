
// 이 파일을 수정하여 당신의 Firebase 프로젝트 설정으로 교체해주세요.
// Firebase 콘솔에서 당신의 웹 앱 설정을 찾을 수 있습니다.

// Firebase SDK에서 필요한 함수들을 가져옵니다.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 사용자가 제공한 Firebase 웹 앱 설정 정보입니다.
const firebaseConfig = {
  apiKey: "AIzaSyDj4pO2SJDiV3AC06mfYHYRa4Y8zws9mkg",
  authDomain: "my-bankruptcy-app.firebaseapp.com",
  projectId: "my-bankruptcy-app",
  storageBucket: "my-bankruptcy-app.appspot.com",
  messagingSenderId: "676844445609",
  appId: "1:676844445609:web:e62aad4943937f327d6eb8"
};

// Firebase 앱을 초기화합니다.
const app = initializeApp(firebaseConfig);

// Firestore 데이터베이스 객체를 가져와서 다른 파일에서 사용할 수 있도록 내보냅니다(export).
export const db = getFirestore(app);
