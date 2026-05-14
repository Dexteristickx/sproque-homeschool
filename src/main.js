import './style.css';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  limit
} from 'firebase/firestore';

/* ---------------------------------------------
   1. Firebase Configuration
   --------------------------------------------- */
const firebaseConfig = {
  apiKey: "AIzaSyBLdB8_W98fFhD6Rksd4gkULPyatIKdIz4",
  authDomain: "sproque-27ce4.firebaseapp.com",
  projectId: "sproque-27ce4",
  storageBucket: "sproque-27ce4.firebasestorage.app",
  messagingSenderId: "305251128016",
  appId: "1:305251128016:web:a21e63579b0b31ea8e84d5",
  measurementId: "G-G711MMWPFH"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Global Actions (Delegated)
document.addEventListener('click', async e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;
  const id = btn.dataset.id;

  if (action === 'delete-announcement') {
    if (await confirmAction('Delete this reminder?')) {
      await deleteDoc(doc(db, 'announcements', id));
      showToast('Reminder removed', 'success');
    }
  }

  if (action === 'report-card') {
    generateReportCard(id);
  }

  if (action === 'delete-student') {
    if (await confirmAction('Delete this student and all their records?')) {
      await deleteDoc(doc(db, 'students', id));
      showToast('Student deleted', 'success');
    }
  }

  if (action === 'edit-student') {
    state.editingStudentId = id;
    const s = state.students.find(x => x.id === id);
    studentName.value = s.name;
    studentAge.value = s.age;
    studentGrade.value = s.grade;
    studentSubmit.textContent = 'Update Student';
    studentCancelBtn.classList.remove('hidden');
    setActiveTab('students');
  }

  if (action === 'delete-topic') {
    if (await confirmAction('Delete this topic?')) {
      await deleteDoc(doc(db, 'topics', id));
      showToast('Topic deleted', 'success');
    }
  }

  if (action === 'edit-topic') {
    state.editingTopicId = id;
    const t = state.topics.find(x => x.id === id);
    topicTitle.value = t.title;
    topicSubject.value = t.subject;
    topicDescription.value = t.description;
    topicDate.value = t.datePrepared;
    state.editingTopicStatus = t.status;
    topicSubmit.textContent = 'Update Topic';
    topicCancelBtn.classList.remove('hidden');
    setActiveTab('curriculum');
  }
});

/* ---------------------------------------------
   2. Application State
   --------------------------------------------- */
const STATUS_FLOW = ['Prepared', 'Taught', 'Tested'];
const STATUS_STYLES = {
  Prepared: 'bg-slate-100 text-slate-700 border-slate-200',
  Taught: 'bg-primary-50 text-primary-700 border-primary-200',
  Tested: 'bg-accent-50 text-accent-700 border-accent-200'
};

const state = {
  user: null,
  students: [],
  topics: [],
  sessions: [],
  attendance: [],
  announcements: [],
  activeTab: 'students',
  editingStudentId: null,
  editingTopicId: null,
  editingTopicStatus: 'Prepared',
  topicAssignedSet: new Set(),
  charts: {}
};

let unsubStudents = null;
let unsubTopics = null;
let unsubSessions = null;
let unsubAttendance = null;
let unsubAnnouncements = null;
let confirmResolver = null;

/* ---------------------------------------------
   3. DOM Elements
   --------------------------------------------- */
// Auth
const loginSection = document.getElementById('loginSection');
const appSection = document.getElementById('appSection');
const authForm = document.getElementById('authForm');
const authToggleButtons = document.querySelectorAll('[data-auth-mode]');
const authSubmit = document.getElementById('authSubmit');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authError = document.getElementById('authError');
const userEmailDisplay = document.getElementById('userEmail');
const signOutBtn = document.getElementById('signOutBtn');

// Navigation
const tabButtons = document.querySelectorAll('[data-tab]');
const sections = document.querySelectorAll('[data-section]');

// Students
const studentForm = document.getElementById('studentForm');
const studentName = document.getElementById('studentName');
const studentAge = document.getElementById('studentAge');
const studentGrade = document.getElementById('studentGrade');
const studentSubmit = document.getElementById('studentSubmit');
const studentCancelBtn = document.getElementById('studentCancelBtn');
const studentList = document.getElementById('studentList');
const studentCountBadge = document.getElementById('studentCountBadge');

// Topics
const topicForm = document.getElementById('topicForm');
const topicSubject = document.getElementById('topicSubject');
const topicTitle = document.getElementById('topicTitle');
const topicDescription = document.getElementById('topicDescription');
const topicResources = document.getElementById('topicResources');
const topicDate = document.getElementById('topicDate');
const topicStudents = document.getElementById('topicStudents');
const topicSubmit = document.getElementById('topicSubmit');
const topicCancelBtn = document.getElementById('topicCancelBtn');
const topicList = document.getElementById('topicList');
const topicCountBadge = document.getElementById('topicCountBadge');
const subjectFilter = document.getElementById('subjectFilter');
const studentFilter = document.getElementById('studentFilter');

// Sessions
const sessionForm = document.getElementById('sessionForm');
const sessionMode = document.getElementById('sessionMode');
const sessionStudent = document.getElementById('sessionStudent');
const sessionTopic = document.getElementById('sessionTopic');
const sessionDate = document.getElementById('sessionDate');
const sessionDuration = document.getElementById('sessionDuration');
const sessionScore = document.getElementById('sessionScore');
const sessionScoreGroup = document.getElementById('sessionScoreGroup');
const sessionNotes = document.getElementById('sessionNotes');
const sessionSubmit = document.getElementById('sessionSubmit');
const sessionNotice = document.getElementById('sessionNotice');
const sessionHistory = document.getElementById('sessionHistory');

// Gradebook
const gradebookContent = document.getElementById('gradebookContent');

// Attendance
const attendanceLogger = document.getElementById('attendanceLogger');
const saveAttendanceBtn = document.getElementById('saveAttendanceBtn');
const attendanceDateFilter = document.getElementById('attendanceDateFilter');
const attendanceHistoryTable = document.getElementById('attendanceHistoryTable');

// Announcements
const announcementList = document.getElementById('announcementList');
const announcementForm = document.getElementById('announcementForm');
const announcementText = document.getElementById('announcementText');

// Calendar
const calendarGrid = document.getElementById('calendarGrid');

// Analytics
const masteryChartCtx = document.getElementById('masteryChart')?.getContext('2d');
const engagementChartCtx = document.getElementById('engagementChart')?.getContext('2d');

// Stats
const statsTaught = document.getElementById('statsTaught');
const statsTested = document.getElementById('statsTested');

// Export
const exportDataBtn = document.getElementById('exportDataBtn');

// Global
const toastContainer = document.getElementById('toastContainer');
const confirmModal = document.getElementById('confirmModal');
const confirmMessage = document.getElementById('confirmMessage');
const confirmAccept = document.getElementById('confirmAccept');
const confirmCancel = document.getElementById('confirmCancel');

/* ---------------------------------------------
   4. UI Utilities
   --------------------------------------------- */
const showToast = (message, variant = 'info') => {
  const toast = document.createElement('div');
  const variants = {
    info: 'bg-primary-600 text-white',
    success: 'bg-emerald-600 text-white',
    error: 'bg-accent-600 text-white',
    warn: 'bg-amber-500 text-slate-900'
  };
  
  toast.className = `px-6 py-4 rounded-2xl shadow-2xl font-bold text-sm animate-fade-in ${variants[variant] || variants.info}`;
  toast.textContent = message;
  
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};

const confirmAction = (message) => {
  confirmMessage.textContent = message;
  confirmModal.classList.remove('hidden');
  confirmModal.classList.add('flex');
  return new Promise(resolve => {
    confirmResolver = resolve;
  });
};

const closeConfirm = (result) => {
  confirmModal.classList.add('hidden');
  confirmModal.classList.remove('flex');
  if (confirmResolver) {
    confirmResolver(result);
    confirmResolver = null;
  }
};

const setActiveTab = (tab) => {
  state.activeTab = tab;
  tabButtons.forEach(btn => {
    const active = btn.dataset.tab === tab;
    btn.classList.toggle('tab-btn-active', active);
    btn.classList.toggle('tab-btn-inactive', !active);
  });
  sections.forEach(section => {
    section.classList.toggle('hidden', section.dataset.section !== tab);
  });
};

const formatDate = (date) => {
  if (!date) return 'Not set';
  return new Date(date).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric'
  });
};

/* ---------------------------------------------
   5. Core Logic & Rendering
   --------------------------------------------- */
const renderStudents = () => {
  studentCountBadge.textContent = `${state.students.length} ${state.students.length === 1 ? 'Student' : 'Students'} Registered`;
  
  if (!state.students.length) {
    studentList.innerHTML = `
      <div class="col-span-full py-12 text-center glass-card rounded-3xl">
        <p class="text-slate-400 font-bold italic">No students registered yet.</p>
      </div>
    `;
    return;
  }

  studentList.innerHTML = state.students.map(student => `
    <article class="glass-card rounded-2xl p-5 hover:border-primary-200 transition-all duration-300 group">
      <div class="flex items-center justify-between mb-4">
        <div class="h-10 w-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 font-bold">
          ${student.name.charAt(0)}
        </div>
        <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button data-action="edit-student" data-id="${student.id}" class="p-2 hover:bg-primary-50 rounded-lg text-primary-600 transition-colors">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>
          <button data-action="delete-student" data-id="${student.id}" class="p-2 hover:bg-accent-50 rounded-lg text-accent-600 transition-colors">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>
      <h4 class="font-bold text-slate-900">${student.name}</h4>
      <div class="mt-1 flex items-center gap-2 text-xs font-bold text-slate-400">
        <span class="px-2 py-0.5 rounded bg-slate-100 uppercase tracking-widest">${student.grade}</span>
        <span>•</span>
        <span>Age ${student.age}</span>
      </div>
    </article>
  `).join('');
};

const renderTopics = () => {
  topicCountBadge.textContent = `${state.topics.length} ${state.topics.length === 1 ? 'Topic' : 'Topics'} Ready`;
  
  const selSubject = subjectFilter.value;
  const selStudent = studentFilter.value;
  
  const filtered = state.topics.filter(t => {
    const subMatch = selSubject === 'all' || t.subject === selSubject;
    const stuMatch = selStudent === 'all' || (t.assignedStudents || []).includes(selStudent);
    return subMatch && stuMatch;
  });

  if (!filtered.length) {
    topicList.innerHTML = '<div class="glass-card rounded-3xl p-12 text-center text-slate-400 font-bold italic">No matching topics found.</div>';
    return;
  }

  topicList.innerHTML = filtered.map(topic => {
    const curIdx = STATUS_FLOW.indexOf(topic.status || 'Prepared');
    const students = (topic.assignedStudents || []).map(id => {
      const s = state.students.find(x => x.id === id);
      return s ? `<span class="px-2 py-1 rounded-lg bg-primary-50 text-primary-600 text-[10px] font-bold">${s.name}</span>` : '';
    }).join(' ');

    return `
      <article class="glass-card rounded-3xl p-6 hover:shadow-2xl transition-all duration-300" data-topic="${topic.id}">
        <div class="flex items-start justify-between gap-4 mb-4">
          <div>
            <span class="text-[10px] font-black uppercase tracking-widest text-primary-600">${topic.subject}</span>
            <h4 class="text-xl font-bold text-slate-900 mt-1">${topic.title}</h4>
          </div>
          <span class="px-4 py-1.5 rounded-xl text-xs font-bold border ${STATUS_STYLES[topic.status] || STATUS_STYLES.Prepared}">
            ${topic.status || 'Prepared'}
          </span>
        </div>
        
        <p class="text-sm text-slate-500 font-medium leading-relaxed mb-4">${topic.description}</p>
        
        <div class="flex flex-wrap gap-4 text-xs font-bold text-slate-400 mb-6">
          <div class="flex items-center gap-2">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            ${formatDate(topic.datePrepared)}
          </div>
        </div>

        <div class="space-y-4">
          <div>
            <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Assigned Students</p>
            <div class="flex flex-wrap gap-2">${students || '<span class="text-slate-300 italic">None</span>'}</div>
          </div>
          
          <div class="flex items-center gap-2 pt-4 border-t border-slate-100">
            <button data-action="advance-topic" data-id="${topic.id}" class="btn-primary py-2 px-4 text-xs">Advance Status</button>
            <button data-action="edit-topic" data-id="${topic.id}" class="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors">Edit</button>
            <button data-action="delete-topic" data-id="${topic.id}" class="px-4 py-2 text-xs font-bold text-accent-500 hover:text-accent-700 transition-colors">Delete</button>
          </div>
        </div>
      </article>
    `;
  }).join('');
};

const renderSessions = () => {
  if (!state.sessions.length) {
    sessionHistory.innerHTML = '<div class="glass-card rounded-3xl p-8 text-center text-slate-400 font-bold italic">No sessions logged yet.</div>';
    return;
  }

  sessionHistory.innerHTML = state.sessions.map(session => {
    const student = state.students.find(s => s.id === session.studentId);
    const topic = state.topics.find(t => t.id === session.topicId);
    const isTest = session.mode === 'testing';

    return `
      <article class="glass-card rounded-2xl p-5 hover:bg-slate-50/50 transition-colors">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
            <div>
              <p class="text-sm font-bold text-slate-900">${student?.name || 'Unknown Student'}</p>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${topic?.title || 'Unknown Topic'}</p>
            </div>
          </div>
          <span class="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${isTest ? 'bg-accent-100 text-accent-600' : 'bg-primary-100 text-primary-600'}">
            ${session.mode}
          </span>
        </div>
        
        <div class="grid grid-cols-2 gap-4 mb-3">
          <div class="text-[10px] font-bold text-slate-400">
            DATE: <span class="text-slate-900">${formatDate(session.sessionDate)}</span>
          </div>
          <div class="text-[10px] font-bold text-slate-400">
            DURATION: <span class="text-slate-900">${session.duration}m</span>
          </div>
        </div>

        ${isTest ? `
          <div class="mb-3 px-3 py-2 bg-accent-50 rounded-xl border border-accent-100">
            <span class="text-[10px] font-black uppercase tracking-widest text-accent-600 mr-2">Score:</span>
            <span class="text-sm font-black text-accent-700">${session.score}%</span>
          </div>
        ` : ''}

        ${session.notes ? `
          <p class="text-xs text-slate-500 italic bg-white/50 p-3 rounded-xl border border-slate-100">${session.notes}</p>
        ` : ''}
      </article>
    `;
  }).join('');
};

const renderGradebook = () => {
  if (!state.students.length) {
    gradebookContent.innerHTML = '<div class="col-span-full glass-card rounded-3xl p-12 text-center text-slate-400 font-bold italic">No students to grade yet.</div>';
    return;
  }

  gradebookContent.innerHTML = state.students.map(student => {
    const studentSessions = state.sessions.filter(s => s.studentId === student.id && s.mode === 'testing' && s.score !== null);
    
    // Group scores by subject
    const subjectGrades = {};
    studentSessions.forEach(s => {
      const topic = state.topics.find(t => t.id === s.topicId);
      if (topic) {
        if (!subjectGrades[topic.subject]) subjectGrades[topic.subject] = [];
        subjectGrades[topic.subject].push(s.score);
      }
    });

    const summary = Object.entries(subjectGrades).map(([subject, scores]) => {
      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      let color = 'text-emerald-600';
      if (avg < 70) color = 'text-amber-600';
      if (avg < 50) color = 'text-accent-600';
      
      return `
        <div class="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
          <span class="text-xs font-bold text-slate-500 uppercase tracking-widest">${subject}</span>
          <span class="text-sm font-black ${color}">${avg}%</span>
        </div>
      `;
    }).join('');

    const overallAvg = studentSessions.length 
      ? Math.round(studentSessions.reduce((a, b) => a + b, 0) / studentSessions.length)
      : null;

    return `
      <article class="glass-card rounded-3xl p-6 hover:shadow-2xl transition-all duration-300">
        <div class="flex items-center gap-4 mb-6">
          <div class="h-12 w-12 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-600 text-xl font-black">
            ${student.name.charAt(0)}
          </div>
          <div>
            <h4 class="font-bold text-slate-900">${student.name}</h4>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">${student.grade}</p>
          </div>
          ${overallAvg !== null ? `
            <div class="ml-auto text-right">
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">GPA</p>
              <p class="text-xl font-black text-primary-600">${overallAvg}%</p>
            </div>
          ` : ''}
        </div>
        
        <div class="space-y-1">
          ${summary || '<p class="text-xs text-slate-400 italic py-4">No test scores recorded yet.</p>'}
        </div>
        
        <div class="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Assessments: ${studentSessions.length}</p>
          <button data-action="report-card" data-id="${student.id}" class="text-[10px] font-black uppercase tracking-widest text-primary-600 hover:text-primary-700 transition-colors flex items-center gap-1">
            <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Report Card
          </button>
        </div>
      </article>
    `;
  }).join('');
};

const generateReportCard = (studentId) => {
  const student = state.students.find(s => s.id === studentId);
  if (!student) return;

  const studentSessions = state.sessions.filter(s => s.studentId === student.id && s.mode === 'testing' && s.score !== null);
  const subjectGrades = {};
  studentSessions.forEach(s => {
    const topic = state.topics.find(t => t.id === s.topicId);
    if (topic) {
      if (!subjectGrades[topic.subject]) subjectGrades[topic.subject] = [];
      subjectGrades[topic.subject].push(s.score);
    }
  });

  const overallAvg = studentSessions.length 
    ? Math.round(studentSessions.reduce((a, b) => a + b, 0) / studentSessions.length)
    : 'N/A';

  const reportWindow = window.open('', '_blank');
  reportWindow.document.write(`
    <html>
      <head>
        <title>Report Card - ${student.name}</title>
        <style>
          body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; }
          .header { text-align: center; margin-bottom: 40px; border-bottom: 4px solid #3b82f6; padding-bottom: 20px; }
          .title { font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; margin: 0; }
          .subtitle { font-size: 14px; font-weight: 700; color: #64748b; margin-top: 5px; }
          .info-grid { display: grid; grid-cols: 2; gap: 20px; margin-bottom: 40px; }
          .info-item { border: 1px solid #e2e8f0; padding: 15px; rounded: 10px; }
          .label { font-size: 10px; font-weight: 900; color: #94a3b8; text-transform: uppercase; margin-bottom: 5px; }
          .value { font-size: 18px; font-weight: 700; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { text-align: left; background: #f8fafc; padding: 15px; font-size: 12px; font-weight: 900; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; }
          td { padding: 15px; border-bottom: 1px solid #f1f5f9; font-size: 14px; font-weight: 600; }
          .score { font-weight: 900; color: #3b82f6; }
          .footer { margin-top: 60px; text-align: center; font-size: 12px; color: #94a3b8; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <p class="subtitle">Sproque Homeschool Organizer</p>
          <h1 class="title">Official Progress Report</h1>
        </div>
        
        <div style="display: flex; gap: 20px; margin-bottom: 40px;">
          <div style="flex: 1; border: 1px solid #e2e8f0; padding: 20px; border-radius: 15px;">
            <div class="label">Student Name</div>
            <div class="value">${student.name}</div>
            <div class="label" style="margin-top: 15px;">Grade Level</div>
            <div class="value">${student.grade}</div>
          </div>
          <div style="flex: 1; border: 1px solid #3b82f6; background: #eff6ff; padding: 20px; border-radius: 15px; text-align: center;">
            <div class="label">Cumulative GPA</div>
            <div class="value" style="font-size: 40px; color: #2563eb;">${overallAvg}%</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Subject</th>
              <th>Assessments</th>
              <th>Average Score</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(subjectGrades).map(([subject, scores]) => `
              <tr>
                <td>${subject}</td>
                <td>${scores.length}</td>
                <td class="score">${Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Generated on ${new Date().toLocaleDateString()} • Authorized Educator: ${state.user.email}</p>
        </div>

        <div class="no-print" style="margin-top: 40px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-weight: 700; cursor: pointer;">Print Report Card</button>
        </div>
      </body>
    </html>
  `);
  reportWindow.document.close();
};

const renderAttendance = () => {
  // Render Attendance Logger
  attendanceLogger.innerHTML = state.students.map(s => `
    <label class="flex items-center gap-3 p-4 glass-card rounded-2xl cursor-pointer hover:border-primary-200 transition-all">
      <input type="checkbox" data-student-id="${s.id}" class="h-5 w-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500">
      <span class="text-sm font-bold text-slate-700">${s.name}</span>
    </label>
  `).join('') || '<p class="col-span-full text-center py-4 text-slate-400 italic">No students registered.</p>';

  // Render Attendance History Table
  if (!state.attendance.length) {
    attendanceHistoryTable.innerHTML = '<p class="text-center py-12 text-slate-400 italic font-bold">No attendance logs found.</p>';
    return;
  }

  // Get last 30 dates that have logs
  const dates = [...new Set(state.attendance.map(a => a.date))].sort().reverse().slice(0, 30);
  
  let html = `
    <table class="w-full text-left border-collapse">
      <thead>
        <tr>
          <th class="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Student</th>
          ${dates.map(d => `<th class="py-4 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">${d.split('-').slice(1).join('/')}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
  `;

  state.students.forEach(student => {
    html += `
      <tr class="hover:bg-slate-50/50">
        <td class="py-4 px-4 text-sm font-bold text-slate-900 border-b border-slate-50">${student.name}</td>
        ${dates.map(date => {
          const log = state.attendance.find(a => a.date === date);
          const present = log?.presentStudents?.includes(student.id);
          return `
            <td class="py-4 px-2 text-center border-b border-slate-50">
              <div class="inline-flex h-6 w-6 items-center justify-center rounded-full ${present ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-300'}">
                ${present ? '✓' : '×'}
              </div>
            </td>
          `;
        }).join('')}
      </tr>
    `;
  });

  html += '</tbody></table>';
  attendanceHistoryTable.innerHTML = html;
};

const renderStats = () => {
  const taught = state.topics.filter(t => t.status === 'Taught').length;
  const tested = state.topics.filter(t => t.status === 'Tested').length;
  if (statsTaught) statsTaught.textContent = taught;
  if (statsTested) statsTested.textContent = tested;
  if (studentCountBadge) studentCountBadge.textContent = `${state.students.length} Students Registered`;
};

const renderAnnouncements = () => {
  if (!state.announcements.length) {
    announcementList.innerHTML = '<p class="text-xs text-slate-400 italic text-center py-4">No active reminders.</p>';
    return;
  }

  announcementList.innerHTML = state.announcements.map(a => `
    <div class="p-4 bg-white rounded-2xl shadow-sm border border-primary-100 flex items-start justify-between group">
      <p class="text-sm font-medium text-slate-700">${a.text}</p>
      <button data-action="delete-announcement" data-id="${a.id}" class="text-slate-300 hover:text-accent-500 opacity-0 group-hover:opacity-100 transition-all">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  `).join('');
};

const renderAnalytics = () => {
  if (state.activeTab !== 'analytics') return;
  if (!masteryChartCtx || !engagementChartCtx) return;

  // Cleanup old charts
  Object.values(state.charts).forEach(c => { if(c && c.destroy) c.destroy(); });

  // Mastery Chart (Radar/Polar)
  const subjects = [...new Set(state.topics.map(t => t.subject))];
  const masteryData = subjects.map(s => {
    const total = state.topics.filter(t => t.subject === s).length;
    const completed = state.topics.filter(t => t.subject === s && t.status === 'Tested').length;
    return (completed / total) * 100;
  });

  state.charts.mastery = new Chart(masteryChartCtx, {
    type: 'polarArea',
    data: {
      labels: subjects,
      datasets: [{
        label: 'Mastery %',
        data: masteryData,
        backgroundColor: [
          'rgba(59, 130, 246, 0.5)',
          'rgba(236, 72, 153, 0.5)',
          'rgba(16, 185, 129, 0.5)',
          'rgba(245, 158, 11, 0.5)',
          'rgba(139, 92, 246, 0.5)'
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } }
    }
  });

  // Engagement Chart (Doughnut)
  const statusCounts = ['Prepared', 'Taught', 'Tested'].map(s => state.topics.filter(t => t.status === s).length);
  state.charts.engagement = new Chart(engagementChartCtx, {
    type: 'doughnut',
    data: {
      labels: ['Prepared', 'Taught', 'Tested'],
      datasets: [{
        data: statusCounts,
        backgroundColor: ['#f1f5f9', '#dbeafe', '#fce7f3'],
        borderColor: ['#e2e8f0', '#bfdbfe', '#fbcfe8'],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      cutout: '70%',
      plugins: { legend: { position: 'bottom' } }
    }
  });
};

const renderCalendar = () => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  calendarGrid.innerHTML = `
    <div class="grid grid-cols-7 gap-4">
      ${days.map(d => `
        <div class="space-y-4">
          <div class="text-center py-2 bg-slate-100 rounded-xl">
            <span class="text-[10px] font-black uppercase tracking-widest text-slate-500">${d}</span>
          </div>
          <div class="space-y-3 min-h-[400px]">
            ${state.topics.filter(t => {
              const dayOfWeek = new Date(t.datePrepared).toLocaleDateString('en-US', { weekday: 'long' });
              return dayOfWeek === d;
            }).map(t => `
              <div class="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer" data-action="edit-topic" data-id="${t.id}">
                <p class="text-[8px] font-black uppercase tracking-widest text-primary-500 mb-1">${t.subject}</p>
                <p class="text-xs font-bold text-slate-900 leading-tight">${t.title}</p>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
};

const exportToCSV = () => {
  const headers = ['Type', 'Name/Title', 'Subject', 'Date', 'Status/Score', 'Notes'];
  const rows = [];

  state.students.forEach(s => rows.push(['Student', s.name, '', '', s.grade, '']));
  state.topics.forEach(t => rows.push(['Topic', t.title, t.subject, t.datePrepared, t.status, t.description]));
  state.sessions.forEach(s => {
    const student = state.students.find(st => st.id === s.studentId);
    const topic = state.topics.find(t => t.id === s.topicId);
    rows.push(['Session', student?.name || 'Unknown', topic?.subject || '', s.sessionDate, s.score || s.mode, s.notes]);
  });

  const csvContent = "data:text/csv;charset=utf-8," 
    + [headers, ...rows].map(e => e.join(",")).join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `sproque_data_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/* ---------------------------------------------
   6. Event Listeners & Firebase Listeners
   --------------------------------------------- */
const startRealtimeListeners = () => {
  if (unsubStudents) return;

  const stuQ = query(collection(db, 'students'), orderBy('name'));
  unsubStudents = onSnapshot(stuQ, snap => {
    state.students = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderStudents();
    updateFormSelects();
  });

  const topQ = query(collection(db, 'topics'), orderBy('updatedAt', 'desc'));
  unsubTopics = onSnapshot(topQ, snap => {
    state.topics = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderTopics();
    updateFormSelects();
    updateFilters();
  });

  const sesQ = query(collection(db, 'sessions'), orderBy('loggedAt', 'desc'), limit(50));
  unsubSessions = onSnapshot(sesQ, snap => {
    state.sessions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderSessions();
    if (state.activeTab === 'gradebook') renderGradebook();
  });

  const attQ = query(collection(db, 'attendance'), orderBy('date', 'desc'), limit(100));
  unsubAttendance = onSnapshot(attQ, snap => {
    state.attendance = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderAttendance();
  });

  const annQ = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(10));
  unsubAnnouncements = onSnapshot(annQ, snap => {
    state.announcements = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderAnnouncements();
  });
  
  renderStats();
};

const updateFormSelects = () => {
  const stuOpts = state.students.map(s => `<option value="${s.id}">${s.name}</option>`);
  sessionStudent.innerHTML = '<option value="">Select Student</option>' + stuOpts.join('');
  
  const topOpts = state.topics.map(t => `<option value="${t.id}">${t.subject}: ${t.title}</option>`);
  sessionTopic.innerHTML = '<option value="">Select Topic</option>' + topOpts.join('');

  // Checkboxes for topic assignment
  topicStudents.innerHTML = state.students.map(s => `
    <label class="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-slate-100">
      <input type="checkbox" name="topicStudent" value="${s.id}" class="rounded text-primary-600 focus:ring-primary-500" ${state.topicAssignedSet.has(s.id) ? 'checked' : ''}>
      <span class="text-xs font-bold text-slate-600">${s.name}</span>
    </label>
  `).join('') || '<p class="text-xs text-slate-400 italic col-span-2 py-2">No students registered yet.</p>';
};

const updateFilters = () => {
  const subjects = [...new Set(state.topics.map(t => t.subject))].sort();
  const oldSub = subjectFilter.value;
  subjectFilter.innerHTML = '<option value="all">All Subjects</option>' + subjects.map(s => `<option value="${s}">${s}</option>`).join('');
  subjectFilter.value = subjects.includes(oldSub) ? oldSub : 'all';

  const oldStu = studentFilter.value;
  studentFilter.innerHTML = '<option value="all">All Students</option>' + state.students.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  studentFilter.value = state.students.some(s => s.id === oldStu) ? oldStu : 'all';
};

// Auth Mode Toggle
let authMode = 'login';
const updateAuthUI = () => {
  const isLogin = authMode === 'login';
  document.getElementById('loginToggle').className = `flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-300 ${isLogin ? 'bg-white shadow-sm text-primary-600' : 'text-slate-400 hover:text-slate-600'}`;
  document.getElementById('registerToggle').className = `flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-300 ${!isLogin ? 'bg-white shadow-sm text-primary-600' : 'text-slate-400 hover:text-slate-600'}`;
  authSubmit.textContent = isLogin ? 'Sign In' : 'Create Account';
  authError.classList.add('hidden');
};

authToggleButtons.forEach(btn => btn.addEventListener('click', () => {
  authMode = btn.dataset.authMode;
  updateAuthUI();
}));

// Auth Submit
authForm.addEventListener('submit', async e => {
  e.preventDefault();
  authError.classList.add('hidden');
  authSubmit.disabled = true;
  const email = authEmail.value;
  const pass = authPassword.value;

  try {
    if (authMode === 'login') {
      await signInWithEmailAndPassword(auth, email, pass);
    } else {
      await createUserWithEmailAndPassword(auth, email, pass);
      showToast('Welcome to Sproque!', 'success');
    }
  } catch (err) {
    authError.textContent = err.message;
    authError.classList.remove('hidden');
  } finally {
    authSubmit.disabled = false;
  }
});

// Auth State
onAuthStateChanged(auth, user => {
  state.user = user;
  if (user) {
    userEmailDisplay.textContent = user.email;
    loginSection.classList.add('hidden');
    appSection.classList.remove('hidden');
    startRealtimeListeners();
    setActiveTab('students');
  } else {
    loginSection.classList.remove('hidden');
    appSection.classList.add('hidden');
    state.students = [];
    state.topics = [];
    state.sessions = [];
    state.attendance = [];
    state.announcements = [];
    if (unsubAttendance) { unsubAttendance(); unsubAttendance = null; }
    if (unsubAnnouncements) { unsubAnnouncements(); unsubAnnouncements = null; }
  }
});

signOutBtn.addEventListener('click', () => signOut(auth));

// Tab Switching
tabButtons.forEach(btn => btn.addEventListener('click', () => {
  const tab = btn.dataset.tab;
  setActiveTab(tab);
  if (tab === 'gradebook') renderGradebook();
  if (tab === 'attendance') renderAttendance();
  if (tab === 'calendar') renderCalendar();
  if (tab === 'analytics') renderAnalytics();
}));

// Announcements
announcementForm.addEventListener('submit', async e => {
  e.preventDefault();
  const text = announcementText.value;
  try {
    await addDoc(collection(db, 'announcements'), {
      text,
      createdAt: serverTimestamp(),
      ownerId: state.user.uid
    });
    announcementForm.reset();
    showToast('Note added', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// Export
exportDataBtn.addEventListener('click', exportToCSV);

// Attendance Logging
saveAttendanceBtn.addEventListener('click', async () => {
  const date = attendanceDateFilter.value;
  if (!date) {
    showToast('Please select a date first', 'warn');
    return;
  }

  const presentStudents = Array.from(attendanceLogger.querySelectorAll('input:checked')).map(i => i.dataset.studentId);
  
  try {
    saveAttendanceBtn.disabled = true;
    // Check if entry for this date already exists
    const existing = state.attendance.find(a => a.date === date);
    const payload = {
      date,
      presentStudents,
      updatedAt: serverTimestamp(),
      ownerId: state.user.uid
    };

    if (existing) {
      await updateDoc(doc(db, 'attendance', existing.id), payload);
      showToast('Attendance updated for ' + date, 'success');
    } else {
      await addDoc(collection(db, 'attendance'), payload);
      showToast('Attendance logged for ' + date, 'success');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    saveAttendanceBtn.disabled = false;
  }
});

// Student Form
studentForm.addEventListener('submit', async e => {
  e.preventDefault();
  const payload = {
    name: studentName.value,
    age: parseInt(studentAge.value),
    grade: studentGrade.value,
    updatedAt: serverTimestamp(),
    ownerId: state.user?.uid
  };

  try {
    if (state.editingStudentId) {
      await updateDoc(doc(db, 'students', state.editingStudentId), payload);
      showToast('Student profile updated', 'success');
    } else {
      await addDoc(collection(db, 'students'), { ...payload, createdAt: serverTimestamp() });
      showToast('Student enrolled successfully', 'success');
    }
    studentForm.reset();
    state.editingStudentId = null;
    studentSubmit.textContent = 'Add Student';
    studentCancelBtn.classList.add('hidden');
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// Topic Form
topicForm.addEventListener('submit', async e => {
  e.preventDefault();
  const assigned = Array.from(topicStudents.querySelectorAll('input:checked')).map(i => i.value);
  const resources = topicResources.value.split('\n').filter(l => l.trim());
  
  const payload = {
    subject: topicSubject.value,
    title: topicTitle.value,
    description: topicDescription.value,
    resources,
    datePrepared: topicDate.value,
    assignedStudents: assigned,
    updatedAt: serverTimestamp(),
    ownerId: state.user?.uid
  };

  try {
    if (state.editingTopicId) {
      await updateDoc(doc(db, 'topics', state.editingTopicId), { ...payload, status: state.editingTopicStatus });
      showToast('Curriculum module updated', 'success');
    } else {
      await addDoc(collection(db, 'topics'), { ...payload, status: 'Prepared', createdAt: serverTimestamp() });
      showToast('New module added to curriculum', 'success');
    }
    topicForm.reset();
    state.editingTopicId = null;
    state.topicAssignedSet = new Set();
    topicSubmit.textContent = 'Save Module';
    topicCancelBtn.classList.add('hidden');
    updateFormSelects();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// Session Logic
sessionMode.addEventListener('change', () => {
  const isTest = sessionMode.value === 'testing';
  sessionScoreGroup.classList.toggle('hidden', !isTest);
});

sessionForm.addEventListener('submit', async e => {
  e.preventDefault();
  const payload = {
    mode: sessionMode.value,
    studentId: sessionStudent.value,
    topicId: sessionTopic.value,
    sessionDate: sessionDate.value,
    duration: parseInt(sessionDuration.value),
    score: sessionMode.value === 'testing' ? parseInt(sessionScore.value) : null,
    notes: sessionNotes.value,
    loggedAt: serverTimestamp(),
    ownerId: state.user?.uid
  };

  try {
    await addDoc(collection(db, 'sessions'), payload);
    
    // Auto-advance topic status
    const topic = state.topics.find(t => t.id === payload.topicId);
    if (topic) {
      let newStatus = topic.status;
      if (payload.mode === 'testing') newStatus = 'Tested';
      else if (topic.status === 'Prepared') newStatus = 'Taught';
      
      if (newStatus !== topic.status) {
        await updateDoc(doc(db, 'topics', topic.id), { status: newStatus, updatedAt: serverTimestamp() });
      }
    }
    
    sessionForm.reset();
    sessionMode.dispatchEvent(new Event('change'));
    showToast('Session logged successfully', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// Lists Interaction (Edit/Delete)
document.addEventListener('click', async e => {
  const editBtn = e.target.closest('[data-action^="edit"]');
  const delBtn = e.target.closest('[data-action^="delete"]');
  const advBtn = e.target.closest('[data-action="advance-topic"]');

  if (editBtn) {
    const id = editBtn.dataset.id;
    if (editBtn.dataset.action === 'edit-student') {
      const s = state.students.find(x => x.id === id);
      state.editingStudentId = id;
      studentName.value = s.name;
      studentAge.value = s.age;
      studentGrade.value = s.grade;
      studentSubmit.textContent = 'Update Profile';
      studentCancelBtn.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (editBtn.dataset.action === 'edit-topic') {
      const t = state.topics.find(x => x.id === id);
      state.editingTopicId = id;
      state.editingTopicStatus = t.status;
      topicSubject.value = t.subject;
      topicTitle.value = t.title;
      topicDescription.value = t.description;
      topicResources.value = (t.resources || []).join('\n');
      topicDate.value = t.datePrepared;
      state.topicAssignedSet = new Set(t.assignedStudents || []);
      topicSubmit.textContent = 'Update Module';
      topicCancelBtn.classList.remove('hidden');
      updateFormSelects();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  if (delBtn) {
    const id = delBtn.dataset.id;
    const type = delBtn.dataset.action.includes('student') ? 'Student' : 'Topic';
    const confirmed = await confirmAction(`Are you sure you want to remove this ${type}? This action cannot be undone.`);
    if (confirmed) {
      try {
        await deleteDoc(doc(db, type === 'Student' ? 'students' : 'topics', id));
        showToast(`${type} removed`, 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  }

  if (advBtn) {
    const id = advBtn.dataset.id;
    const t = state.topics.find(x => x.id === id);
    const curIdx = STATUS_FLOW.indexOf(t.status || 'Prepared');
    if (curIdx < STATUS_FLOW.length - 1) {
      const next = STATUS_FLOW[curIdx + 1];
      await updateDoc(doc(db, 'topics', id), { status: next, updatedAt: serverTimestamp() });
      showToast(`Status updated to ${next}`, 'success');
    }
  }
});

// Confirm Modal
confirmAccept.addEventListener('click', () => closeConfirm(true));
confirmCancel.addEventListener('click', () => closeConfirm(false));

// Init
updateAuthUI();
setActiveTab('students');
topicDate.value = new Date().toISOString().split('T')[0];
sessionDate.value = new Date().toISOString().split('T')[0];
attendanceDateFilter.value = new Date().toISOString().split('T')[0];
