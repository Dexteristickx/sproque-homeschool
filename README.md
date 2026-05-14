# Sproque Homeschool Organizer (Integrated School Digital System)

Welcome to the **Sproque Homeschool Suite**, a premium, blue-forward digital system designed for educator efficiency and curriculum mastery tracking.

## 🚀 Getting Started

### 1. Firebase Setup
1. Visit the [Firebase Console](https://console.firebase.google.com).
2. Create a new project.
3. Enable **Authentication** (Email/Password).
4. Enable **Firestore Database** in Production Mode.
5. Add a Web App and copy your config object into `src/main.js`.

### 2. Firestore Security Rules
Use the following rules to ensure only authenticated users can access the data:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 3. Local Development
```bash
npm install
npm run dev
```

## 🎨 Design Philosophy
- **Blue & Pink Aesthetic**: Professional primary blues with high-contrast pink (accent) highlights for destructive or critical actions.
- **Glassmorphism**: Modern translucency effects for a premium "Apple-like" feel.
- **Dynamic Mastery**: A 3-stage status flow (**Prepared** → **Taught** → **Tested**) that updates automatically via session logging.

## 📖 Usage Guide

### Administrator / Parent-Educator
- **Rostering**: Add students in the **Students** tab.
- **Curriculum**: Build subjects and modules in the **Curriculum** tab.
- **Monitoring**: Use filters to see progress by subject or specific student.

### Instruction & Assessment
- **Log Session**: Use the **Log Session** tab daily.
- **Teaching Mode**: Captures engagement and moves topics to "Taught".
- **Testing Mode**: Records scores and moves topics to "Tested" (Mastery).

## 🛠 Tech Stack
- **Vite**: Modern frontend tooling.
- **Tailwind CSS**: Utility-first styling with premium custom components.
- **Firebase**: Real-time authentication and cloud database.
- **Google Fonts**: Outfit & Inter for high-end typography.
