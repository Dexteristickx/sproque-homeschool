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
  limit,
  where
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
  isStudentView: false,
  isDarkMode: false,
  quizzes: [],
  editingStudentId: null,
  editingTopicId: null,
  editingTopicStatus: 'Prepared',
  topicAssignedSet: new Set(),
  charts: {}
};

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
const togglePassword = document.getElementById('togglePassword');
const eyeIcon = document.getElementById('eyeIcon');
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
const studentAvatar = document.getElementById('studentAvatar');
const studentSubmit = document.getElementById('studentSubmit');
const studentCancelBtn = document.getElementById('studentCancelBtn');
const studentList = document.getElementById('studentList');
const studentCountBadge = document.getElementById('studentCountBadge');

// Agenda
const agendaWidget = document.getElementById('agendaWidget');
const agendaItems = document.getElementById('agendaItems');
const agendaDate = document.getElementById('agendaDate');

// Topics
const topicForm = document.getElementById('topicForm');
const topicSubject = document.getElementById('topicSubject');
const topicTitle = document.getElementById('topicTitle');
const topicDescription = document.getElementById('topicDescription');
const topicResources = document.getElementById('topicResources');
const topicResourceLink = document.getElementById('topicResourceLink');
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
const switchViewBtn = document.getElementById('switchViewBtn');
const darkModeToggle = document.getElementById('darkModeToggle');
const moonIcon = document.getElementById('moonIcon');
const sunIcon = document.getElementById('sunIcon');

// Master Features
const aiAssistBtn = document.getElementById('aiAssistBtn');
const libraryContent = document.getElementById('libraryContent');
const quizList = document.getElementById('quizList');
const quizFormContainer = document.getElementById('quizFormContainer');
const quizForm = document.getElementById('quizForm');
const quizTopicSelect = document.getElementById('quizTopicSelect');
const quizQuestionsContainer = document.getElementById('quizQuestionsContainer');
const addQuestionBtn = document.getElementById('addQuestionBtn');
const addQuizBtn = document.getElementById('addQuizBtn');
const cancelQuizBtn = document.getElementById('cancelQuizBtn');
const quizModal = document.getElementById('quizModal');
const quizTitle = document.getElementById('quizTitle');
const quizActiveContent = document.getElementById('quizActiveContent');
const submitQuizAttempt = document.getElementById('submitQuizAttempt');
const closeQuizModal = document.getElementById('closeQuizModal');

/* ---------------------------------------------
   4. UI Utilities
   --------------------------------------------- */
const showToast = (message, variant = 'info') => {
  const toast = document.createElement('div');
  const variants = {
    info: 'bg-emerald-600/90 backdrop-blur-xl text-white border border-white/10',
    success: 'bg-emerald-600 text-white',
    error: 'bg-amber-600 text-white',
    warn: 'bg-amber-500 text-white'
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
let unsubStudents, unsubTopics, unsubSessions, unsubAttendance, unsubAnnouncements, unsubQuizzes;

const startRealtimeListeners = () => {
  if (unsubStudents) unsubStudents();
  if (unsubTopics) unsubTopics();
  if (unsubSessions) unsubSessions();
  if (unsubAttendance) unsubAttendance();
  if (unsubAnnouncements) unsubAnnouncements();
  if (unsubQuizzes) unsubQuizzes();

  const q = (path) => query(collection(db, path), where('ownerId', '==', state.user.uid));

  unsubStudents = onSnapshot(q('students'), snap => {
    state.students = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderStudents();
    updateFormSelects();
    updateFilters();
    renderAttendance();
  });

  unsubTopics = onSnapshot(q('topics'), snap => {
    state.topics = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderTopics();
    updateFormSelects();
    updateFilters();
    renderStats();
    renderAgenda();
    renderCalendar();
    renderLibrary();
  });

  unsubSessions = onSnapshot(q('sessions'), snap => {
    state.sessions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderSessions();
    renderStats();
    renderGradebook();
  });

  unsubAttendance = onSnapshot(q('attendance'), snap => {
    state.attendance = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderAttendance();
  });

  unsubAnnouncements = onSnapshot(q('announcements'), snap => {
    state.announcements = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderAnnouncements();
  });

  unsubQuizzes = onSnapshot(q('quizzes'), snap => {
    state.quizzes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderQuizzes();
  });
};

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

  studentList.innerHTML = state.students.map(student => {
    // Calculate Progress
    const assignedTopics = state.topics.filter(t => (t.assignedStudents || []).includes(student.id));
    const testedTopics = assignedTopics.filter(t => t.status === 'Tested');
    const progress = assignedTopics.length ? Math.round((testedTopics.length / assignedTopics.length) * 100) : 0;

    return `
      <article class="glass-card rounded-2xl p-5 hover:border-primary-200 transition-all duration-300 group">
        <div class="flex items-center justify-between mb-4">
          ${student.avatar ? `
            <img src="${student.avatar}" class="h-12 w-12 rounded-xl object-cover border-2 border-primary-100" />
          ` : `
            <div class="h-12 w-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-xl">
              ${student.name.charAt(0)}
            </div>
          `}
          <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button data-action="edit-student" data-id="${student.id}" class="p-2 hover:bg-primary-50 rounded-lg text-primary-600 transition-colors">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </button>
            <button data-action="delete-student" data-id="${student.id}" class="p-2 hover:bg-accent-50 rounded-lg text-accent-600 transition-colors">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </div>
        <h4 class="font-bold text-white">${student.name}</h4>
        <div class="mt-1 flex items-center gap-2 text-xs font-bold text-slate-500">
          <span class="px-2 py-0.5 rounded bg-white/5 uppercase tracking-widest text-slate-400">${student.grade}</span>
          <span>•</span>
          <span>Age ${student.age}</span>
        </div>
        
        <div class="mt-4">
          <div class="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">
            <span>Milestone Progress</span>
            <span>${progress}%</span>
          </div>
          <div class="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
            <div class="h-full bg-amber-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(245,158,11,0.3)]" style="width: ${progress}%"></div>
          </div>
        </div>
      </article>
    `;
  }).join('');
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
            <span class="text-[10px] font-black uppercase tracking-widest text-emerald-500">${topic.subject}</span>
            <h4 class="text-xl font-bold text-white mt-1">${topic.title}</h4>
          </div>
          <span class="px-4 py-1.5 rounded-xl text-xs font-bold border border-white/10 bg-white/5 text-slate-300">
            ${topic.status || 'Prepared'}
          </span>
        </div>
        
        <p class="text-sm text-slate-400 font-medium leading-relaxed mb-4">${topic.description}</p>
        
        <div class="flex flex-wrap gap-4 text-xs font-bold text-slate-500 mb-6">
          <div class="flex items-center gap-2">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            ${formatDate(topic.datePrepared)}
          </div>
        </div>

        <div class="space-y-4">
          <div>
            <p class="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Assigned Students</p>
            <div class="flex flex-wrap gap-2">${students || '<span class="text-slate-600 italic">None</span>'}</div>
          </div>
          
          <div class="flex items-center gap-2 pt-4 border-t border-white/5">
            ${topic.resourceLink ? `
              <button onclick="window.viewResource('${topic.resourceLink}', '${topic.title.replace(/'/g, "\\'")}', '${topic.subject.replace(/'/g, "\\'")}')" class="flex-1 text-center py-2 bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer">
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                View Resource
              </button>
            ` : ''}
            <button data-action="advance-topic" data-id="${topic.id}" class="btn-primary py-2 px-4 text-xs">Advance</button>
            <button data-action="edit-topic" data-id="${topic.id}" class="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors">Edit</button>
            <button data-action="delete-topic" data-id="${topic.id}" class="px-4 py-2 text-xs font-bold text-amber-500 hover:text-amber-400 transition-colors">Delete</button>
          </div>
        </div>
      </article>
    `;
  }).join('');
};

const renderAgenda = () => {
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTopics = state.topics.filter(t => t.datePrepared === todayStr);
  
  if (!todayTopics.length) {
    agendaWidget.classList.add('hidden');
    return;
  }

  agendaWidget.classList.remove('hidden');
  agendaDate.textContent = new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  
  agendaItems.innerHTML = todayTopics.map(t => `
    <div class="p-4 bg-white/60 rounded-2xl border border-accent-100 flex items-center justify-between group hover:bg-white transition-all cursor-pointer" data-tab="curriculum" onclick="document.querySelector('[data-tab=curriculum]').click()">
      <div class="flex items-center gap-4">
        <div class="h-10 w-10 rounded-xl bg-accent-100 flex items-center justify-center text-accent-600">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
        </div>
        <div>
          <p class="text-[10px] font-black uppercase tracking-widest text-accent-500">${t.subject}</p>
          <p class="text-sm font-bold text-white">${t.title}</p>
        </div>
      </div>
      <div class="px-3 py-1 rounded-lg bg-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500">
        ${t.status}
      </div>
    </div>
  `).join('');
};

const renderLibrary = () => {
  const links = state.topics.filter(t => t.resourceLink || (t.resources && t.resources.length > 0));
  
  if (!links.length) {
    libraryContent.innerHTML = '<div class="col-span-full glass-card p-12 text-center italic text-slate-400">No resources in your vault yet. Add links to your curriculum modules.</div>';
    return;
  }

  libraryContent.innerHTML = links.map(t => `
    <article class="glass-card rounded-2xl p-6 hover:border-primary-200 transition-all group">
      <div class="flex items-center gap-3 mb-4">
        <span class="px-2 py-1 rounded bg-primary-50 text-[8px] font-black uppercase tracking-widest text-primary-600">${t.subject}</span>
        <h4 class="font-bold text-white truncate">${t.title}</h4>
      </div>
      ${t.resourceLink ? `
        <button onclick="window.viewResource('${t.resourceLink}', '${t.title.replace(/'/g, "\\'")}', '${t.subject.replace(/'/g, "\\'")}')" class="block w-full text-center py-3 bg-white/5 hover:bg-white/10 text-xs font-black uppercase tracking-widest text-slate-300 hover:text-white rounded-xl transition-all mb-2 border border-white/10 cursor-pointer">
          Main Resource
        </button>
      ` : ''}
      ${(t.resources || []).map(r => `
        <div class="text-[10px] font-medium text-slate-500 bg-white/50 p-2 rounded-lg border border-slate-50 mb-1 truncate">${r}</div>
      `).join('')}
    </article>
  `).join('');
};

const renderQuizzes = () => {
  if (!state.quizzes.length) {
    quizList.innerHTML = '<div class="col-span-full glass-card p-12 text-center italic text-slate-400">No quizzes created. Start by clicking "Create New Quiz".</div>';
    return;
  }

  quizList.innerHTML = state.quizzes.map(q => {
    const topic = state.topics.find(t => t.id === q.topicId);
    return `
      <article class="glass-card rounded-3xl p-6 border-slate-100 hover:border-accent-200 transition-all group">
        <div class="flex items-start justify-between mb-4">
          <div>
            <p class="text-[10px] font-black uppercase tracking-widest text-accent-600">${topic?.subject || 'Misc'}</p>
            <h4 class="text-lg font-bold text-white mt-1">${topic?.title || 'Untitled Quiz'}</h4>
          </div>
          <button data-action="delete-quiz" data-id="${q.id}" class="text-slate-300 hover:text-accent-600 transition-colors opacity-0 group-hover:opacity-100 educator-only">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
        <p class="text-xs font-medium text-slate-500 mb-6">${q.questions.length} Questions</p>
        <button data-action="take-quiz" data-id="${q.id}" class="w-full py-3 bg-accent-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-accent-700 transition-all shadow-lg shadow-accent-500/20">
          Take Quiz
        </button>
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
              <p class="text-sm font-bold text-white">${student?.name || 'Unknown Student'}</p>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${topic?.title || 'Unknown Topic'}</p>
            </div>
          </div>
          <span class="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${isTest ? 'bg-accent-100 text-accent-600' : 'bg-primary-100 text-primary-600'}">
            ${session.mode}
          </span>
        </div>
        
        <div class="grid grid-cols-2 gap-4 mb-3">
          <div class="text-[10px] font-bold text-slate-400">
            DATE: <span class="text-white">${formatDate(session.sessionDate)}</span>
          </div>
          <div class="text-[10px] font-bold text-slate-400">
            DURATION: <span class="text-white">${session.duration}m</span>
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
          ${student.avatar ? `
            <img src="${student.avatar}" class="h-12 w-12 rounded-2xl object-cover" />
          ` : `
            <div class="h-12 w-12 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-600 text-xl font-black">
              ${student.name.charAt(0)}
            </div>
          `}
          <div>
            <h4 class="font-bold text-white">${student.name}</h4>
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
        <td class="py-4 px-4 text-sm font-bold text-white border-b border-slate-50">${student.name}</td>
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
                <p class="text-xs font-bold text-white leading-tight">${t.title}</p>
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

const toggleViewMode = () => {
  state.isStudentView = !state.isStudentView;
  switchViewBtn.textContent = state.isStudentView ? 'Educator View' : 'Student View';
  
  // Hide all administrative forms and buttons
  const forms = [studentForm, topicForm, sessionForm, announcementForm, attendanceLogger.parentElement.parentElement];
  forms.forEach(f => {
    if (f) f.classList.toggle('hidden', state.isStudentView);
  });

  // Hide edit/delete actions
  document.body.classList.toggle('student-mode', state.isStudentView);
  
  showToast(`Switched to ${state.isStudentView ? 'Student' : 'Educator'} View`, 'info');
  
  // Re-render components to reflect visibility
  renderStudents();
  renderTopics();
  renderGradebook();
};

const updateFormSelects = () => {
  const stuOpts = state.students.map(s => `<option value="${s.id}">${s.name}</option>`);
  sessionStudent.innerHTML = '<option value="">Select Student</option>' + stuOpts.join('');
  
  const topOpts = state.topics.map(t => `<option value="${t.id}">${t.subject}: ${t.title}</option>`);
  sessionTopic.innerHTML = '<option value="">Select Topic</option>' + topOpts.join('');

  // Checkboxes for topic assignment
  topicStudents.innerHTML = state.students.map(s => `
    <label class="flex items-center gap-2 p-2 hover:bg-white/5 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-white/5">
      <input type="checkbox" name="topicStudent" value="${s.id}" class="rounded text-emerald-600 focus:ring-emerald-500 bg-white/5 border-white/10" ${state.topicAssignedSet.has(s.id) ? 'checked' : ''}>
      <span class="text-xs font-bold text-slate-300">${s.name}</span>
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
  document.getElementById('loginToggle').className = `flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-300 ${isLogin ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`;
  document.getElementById('registerToggle').className = `flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-300 ${!isLogin ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`;
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

if (signOutBtn) signOutBtn.addEventListener('click', () => signOut(auth));

// Password Toggle
if (togglePassword) {
  togglePassword.addEventListener('click', () => {
    const isPassword = authPassword.type === 'password';
    authPassword.type = isPassword ? 'text' : 'password';
    
    if (isPassword) {
      // Show Eye Off (Hidden)
      eyeIcon.innerHTML = `
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.976 9.976 0 012.146-3.512M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3l18 18" />
      `;
    } else {
      // Show Eye (Visible)
      eyeIcon.innerHTML = `
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      `;
    }
  });
}

// View Switching
if (switchViewBtn) {
  switchViewBtn.addEventListener('click', toggleViewMode);
}

// Tab Switching
if (tabButtons) {
  tabButtons.forEach(btn => btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    setActiveTab(tab);
    if (tab === 'gradebook') renderGradebook();
    if (tab === 'attendance') renderAttendance();
    if (tab === 'calendar') renderCalendar();
    if (tab === 'analytics') renderAnalytics();
    if (tab === 'library') renderLibrary();
    if (tab === 'quizzes') renderQuizzes();
  }));
}

// Standalone AI Educational Planner Engine
const runAIAssist = (title, subject) => {
  const cleanSubject = (subject || 'General').toLowerCase().trim();
  
  // Subject-specific educational frameworks
  const frameworks = {
    science: {
      intro: `Explore the foundational concepts of "${title}" in scientific inquiry.`,
      objectives: [
        `Understand the core biological, chemical, or physical mechanisms governing ${title}.`,
        `Investigate real-world systems, cycles, and phenomena related to this topic.`,
        `Develop critical scientific thinking and laboratory observation skills.`
      ],
      activities: `Interactive science experiment/simulation, diagram labeling, and a concept review quiz.`,
      legacy: `Study guide on ${title}, with focus on lab procedures and vocabulary terms.`
    },
    math: {
      intro: `Master the mathematical principles and problem-solving techniques for "${title}".`,
      objectives: [
        `Identify and apply the core formulas, equations, and rules of ${title}.`,
        `Solve multi-step equations and apply mathematical models to practical challenges.`,
        `Build logical reasoning, analytical analysis, and deductive proof capabilities.`
      ],
      activities: `Practice worksheet problems, collaborative whiteboard solving, and a digital test.`,
      legacy: `Homework packet assignment for ${title}, tracking conceptual mastery metrics.`
    },
    history: {
      intro: `Analyze the historical significance, key figures, and cultural impacts of "${title}".`,
      objectives: [
        `Trace the timeline of events, origins, and long-term consequences of this period.`,
        `Compare and contrast primary source documents and distinct socio-political viewpoints.`,
        `Understand the relevance of ${title} to modern democratic systems and global culture.`
      ],
      activities: `Primary source document review, creative timeline mapping, and group discussion.`,
      legacy: `Reading review for ${title}, comparing primary resources with historical summaries.`
    },
    english: {
      intro: `Examine the literary elements, grammatical structures, and vocabulary of "${title}".`,
      objectives: [
        `Analyze theme, character arcs, or stylistic devices within the studied texts.`,
        `Apply advanced composition, syntax structure, and narrative techniques.`,
        `Enhance critical textual analysis, active reading comprehension, and presentation skills.`
      ],
      activities: `Creative writing prompt, comparative textual analysis, and peer editing workshop.`,
      legacy: `Essay outline and writing checklist for ${title}, analyzing vocabulary and grammar structure.`
    }
  };

  // Select matching framework or fallback
  let framework = frameworks.science; // Default fallback
  if (cleanSubject.includes('math') || cleanSubject.includes('algebra') || cleanSubject.includes('calculus') || cleanSubject.includes('geometry') || cleanSubject.includes('arithmetic')) {
    framework = frameworks.math;
  } else if (cleanSubject.includes('hist') || cleanSubject.includes('social') || cleanSubject.includes('civic') || cleanSubject.includes('geography')) {
    framework = frameworks.history;
  } else if (cleanSubject.includes('eng') || cleanSubject.includes('lit') || cleanSubject.includes('lang') || cleanSubject.includes('read') || cleanSubject.includes('writ')) {
    framework = frameworks.english;
  } else if (cleanSubject.includes('sci') || cleanSubject.includes('bio') || cleanSubject.includes('chem') || cleanSubject.includes('phys')) {
    framework = frameworks.science;
  }

  // 1. Build beautiful, rich objectives
  const objectivesText = `${framework.intro}\n\n🎯 Learning Objectives:\n1. ${framework.objectives[0]}\n2. ${framework.objectives[1]}\n3. ${framework.objectives[2]}`;
  
  // 2. Build beautiful, rich legacy notes / activities
  const legacyText = `💡 Suggested Lesson Activities:\n• ${framework.activities}\n\n📝 Legacy Notes & Teaching Checklist:\n• ${framework.legacy}`;

  if (topicDescription) topicDescription.value = objectivesText;
  if (topicResources) topicResources.value = legacyText;
};

// Master Logic: AI Assist
if (aiAssistBtn) {
  aiAssistBtn.addEventListener('click', async () => {
    const title = topicTitle.value.trim();
    const subject = topicSubject.value.trim() || 'General';
    
    if (!title) {
      showToast('Please enter a topic title first', 'warn');
      return;
    }

    aiAssistBtn.disabled = true;
    const originalText = aiAssistBtn.innerHTML;
    aiAssistBtn.innerHTML = '<span class="animate-pulse italic">Consulting AI Scholar...</span>';
    
    setTimeout(() => {
      try {
        runAIAssist(title, subject);
        showToast('AI lesson plan generated!', 'success');
      } catch (err) {
        console.error(err);
        showToast('Failed to generate AI plan', 'error');
      } finally {
        aiAssistBtn.disabled = false;
        aiAssistBtn.innerHTML = originalText;
      }
    }, 800);
  });
}

// Master Logic: Quizzes
if (addQuizBtn) {
  addQuizBtn.addEventListener('click', () => {
    if (quizFormContainer) quizFormContainer.classList.remove('hidden');
    if (quizQuestionsContainer) quizQuestionsContainer.innerHTML = '';
    addQuestion(0);
    updateQuizTopicSelect();
  });
}

if (cancelQuizBtn) {
  cancelQuizBtn.addEventListener('click', () => {
    if (quizFormContainer) quizFormContainer.classList.add('hidden');
  });
}

const addQuestion = (index) => {
  const div = document.createElement('div');
  div.className = 'p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3';
  div.innerHTML = `
    <input type="text" class="input-field bg-white" placeholder="Question ${index + 1}" required data-q-text>
    <div class="grid grid-cols-2 gap-2">
      <input type="text" class="input-field bg-white py-1.5" placeholder="Option A" required data-opt-a>
      <input type="text" class="input-field bg-white py-1.5" placeholder="Option B" required data-opt-b>
    </div>
    <select class="input-field bg-white py-1.5" required data-correct>
      <option value="">Correct Answer</option>
      <option value="A">Option A</option>
      <option value="B">Option B</option>
    </select>
  `;
  if (quizQuestionsContainer) quizQuestionsContainer.appendChild(div);
};

if (addQuestionBtn) {
  addQuestionBtn.addEventListener('click', () => {
    if (quizQuestionsContainer) addQuestion(quizQuestionsContainer.children.length);
  });
}

const updateQuizTopicSelect = () => {
  if (quizTopicSelect) {
    quizTopicSelect.innerHTML = state.topics.map(t => `<option value="${t.id}">${t.title}</option>`).join('');
  }
};

if (quizForm) {
  quizForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (!quizQuestionsContainer) return;
    const questions = Array.from(quizQuestionsContainer.children).map(div => ({
      text: div.querySelector('[data-q-text]').value,
      optA: div.querySelector('[data-opt-a]').value,
      optB: div.querySelector('[data-opt-b]').value,
      correct: div.querySelector('[data-correct]').value
    }));

    try {
      await addDoc(collection(db, 'quizzes'), {
        topicId: quizTopicSelect.value,
        questions,
        createdAt: serverTimestamp(),
        ownerId: state.user.uid
      });
      if (quizFormContainer) quizFormContainer.classList.add('hidden');
      showToast('Interactive quiz created!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

// Take Quiz Logic
let activeQuiz = null;
let quizAnswers = [];

const takeQuiz = (quizId) => {
  activeQuiz = state.quizzes.find(q => q.id === quizId);
  const topic = state.topics.find(t => t.id === activeQuiz.topicId);
  
  if (quizTitle) quizTitle.textContent = topic?.title || 'Quiz';
  if (quizActiveContent) {
    quizActiveContent.innerHTML = activeQuiz.questions.map((q, i) => `
      <div class="space-y-4">
        <p class="font-bold text-white">${i + 1}. ${q.text}</p>
        <div class="grid grid-cols-2 gap-4">
          <button onclick="window.selectQuizAnswer(${i}, 'A')" class="quiz-opt-btn p-4 border-2 border-slate-100 rounded-2xl font-bold hover:border-primary-500 transition-all text-left" id="q-${i}-A">
            <span class="text-primary-600 mr-2">A</span> ${q.optA}
          </button>
          <button onclick="window.selectQuizAnswer(${i}, 'B')" class="quiz-opt-btn p-4 border-2 border-slate-100 rounded-2xl font-bold hover:border-primary-500 transition-all text-left" id="q-${i}-B">
            <span class="text-primary-600 mr-2">B</span> ${q.optB}
          </button>
        </div>
      </div>
    `).join('');
  }
  
  quizAnswers = new Array(activeQuiz.questions.length).fill(null);
  if (quizModal) quizModal.classList.remove('hidden');
};

window.selectQuizAnswer = (qIdx, answer) => {
  quizAnswers[qIdx] = answer;
  // Visual feedback
  if (quizModal) {
    const opts = quizModal.querySelectorAll(`[id^="q-${qIdx}-"]`);
    opts.forEach(o => o.classList.remove('border-primary-500', 'bg-primary-50'));
    const ansEl = document.getElementById(`q-${qIdx}-${answer}`);
    if (ansEl) ansEl.classList.add('border-primary-500', 'bg-primary-50');
  }
};

if (submitQuizAttempt) {
  submitQuizAttempt.addEventListener('click', () => {
    if (quizAnswers.includes(null)) {
      showToast('Please answer all questions', 'warn');
      return;
    }

    let correct = 0;
    activeQuiz.questions.forEach((q, i) => {
      if (q.correct === quizAnswers[i]) correct++;
    });

    const score = Math.round((correct / activeQuiz.questions.length) * 100);
    if (quizModal) quizModal.classList.add('hidden');
    
    // Custom Alert for result
    const title = score >= 70 ? '🎉 Mastery Achieved!' : '📚 Keep Learning!';
    confirmAction(`${title}\nYou scored ${score}%\n\nWould you like to log this result to the Gradebook?`).then(confirmed => {
      if (confirmed) {
        setActiveTab('sessions');
        if (sessionTopic) sessionTopic.value = activeQuiz.topicId;
        if (sessionMode) {
          sessionMode.value = 'testing';
          sessionMode.dispatchEvent(new Event('change'));
        }
        if (sessionScore) sessionScore.value = score;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });
}

if (closeQuizModal) {
  closeQuizModal.addEventListener('click', () => {
    if (quizModal) quizModal.classList.add('hidden');
  });
}

// Master Logic: Dark Mode
if (darkModeToggle) {
  darkModeToggle.addEventListener('click', () => {
    state.isDarkMode = !state.isDarkMode;
    document.body.classList.toggle('dark', state.isDarkMode);
    if (moonIcon) moonIcon.classList.toggle('hidden', state.isDarkMode);
    if (sunIcon) sunIcon.classList.toggle('hidden', !state.isDarkMode);
    showToast(`Switched to ${state.isDarkMode ? 'Midnight Scholar' : 'Ivy League'} Mode`, 'info');
  });
}

// Announcements
if (announcementForm) {
  announcementForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (!announcementText) return;
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
}

// Export
if (exportDataBtn) {
  exportDataBtn.addEventListener('click', exportToCSV);
}

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
    avatar: studentAvatar.value,
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
    resourceLink: topicResourceLink.value,
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
      studentAvatar.value = s.avatar || '';
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
      topicResourceLink.value = t.resourceLink || '';
      topicDate.value = t.datePrepared;
      state.topicAssignedSet = new Set(t.assignedStudents || []);
      topicSubmit.textContent = 'Update Module';
      topicCancelBtn.classList.remove('hidden');
      updateFormSelects();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setActiveTab('curriculum');
    }
  }

  if (e.target.closest('[data-action="take-quiz"]')) {
    takeQuiz(e.target.closest('[data-action="take-quiz"]').dataset.id);
  }

  if (delBtn) {
    const id = delBtn.dataset.id;
    const action = delBtn.dataset.action;

    if (action === 'delete-quiz') {
      if (await confirmAction('Delete this quiz forever?')) {
        await deleteDoc(doc(db, 'quizzes', id));
        showToast('Quiz removed', 'success');
      }
      return;
    }

    if (action === 'delete-announcement') {
      if (await confirmAction('Delete this reminder?')) {
        await deleteDoc(doc(db, 'announcements', id));
        showToast('Reminder removed', 'success');
      }
      return;
    }

    const type = action.includes('student') ? 'Student' : 'Topic';
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

  if (e.target.closest('[data-action="report-card"]')) {
    generateReportCard(e.target.closest('[data-action="report-card"]').dataset.id);
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

/* ---------------------------------------------
   7. Google Drive Integration (OAuth)
   --------------------------------------------- */
const googleLoginBtn = document.getElementById('googleLoginBtn');
const googleLogoutBtn = document.getElementById('googleLogoutBtn');
const driveUploadSection = document.getElementById('driveUploadSection');
const uploadDriveBtn = document.getElementById('uploadDriveBtn');
const topicResourceFile = document.getElementById('topicResourceFile');

// Lesson Browser elements
const browseDriveBtn = document.getElementById('browseDriveBtn');
const gdriveBrowserModal = document.getElementById('gdriveBrowserModal');
const closeGdriveBrowserBtn = document.getElementById('closeGdriveBrowserBtn');
const gdriveBrowserBackBtn = document.getElementById('gdriveBrowserBackBtn');
const gdriveBrowserSubtitle = document.getElementById('gdriveBrowserSubtitle');
const gdriveBrowserLoading = document.getElementById('gdriveBrowserLoading');
const gdriveBrowserEmpty = document.getElementById('gdriveBrowserEmpty');
const gdriveBrowserEmptyMsg = document.getElementById('gdriveBrowserEmptyMsg');
const gdriveFilesContainer = document.getElementById('gdriveFilesContainer');

// Resource Preview elements
const resourcePreviewModal = document.getElementById('resourcePreviewModal');
const previewModalTitle = document.getElementById('previewModalTitle');
const previewModalSubject = document.getElementById('previewModalSubject');
const closePreviewModalBtn = document.getElementById('closePreviewModalBtn');
const previewModalLoading = document.getElementById('previewModalLoading');
const previewModalIframe = document.getElementById('previewModalIframe');

window.viewResource = (url, title, subject) => {
  if (!resourcePreviewModal || !previewModalIframe) return;

  // Master Parser for Google Workspace document views (stripping editor controls)
  let embedUrl = url;
  
  if (url.includes('/document/d/')) {
    const docMatch = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
    if (docMatch) {
      embedUrl = `https://docs.google.com/document/d/${docMatch[1]}/preview`;
    }
  } else if (url.includes('/presentation/d/')) {
    const slidesMatch = url.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
    if (slidesMatch) {
      embedUrl = `https://docs.google.com/presentation/d/${slidesMatch[1]}/preview`;
    }
  } else if (url.includes('/spreadsheets/d/')) {
    const sheetsMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (sheetsMatch) {
      embedUrl = `https://docs.google.com/spreadsheets/d/${sheetsMatch[1]}/preview`;
    }
  } else {
    const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch) {
      embedUrl = `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    }
  }

  // Set UI fields
  if (previewModalTitle) previewModalTitle.textContent = title || 'Lesson Resource';
  if (previewModalSubject) previewModalSubject.textContent = subject || 'General';

  // Show loading spinner and set iframe src
  if (previewModalLoading) previewModalLoading.classList.remove('hidden');
  previewModalIframe.src = embedUrl;

  // Open modal
  resourcePreviewModal.classList.remove('hidden');
  resourcePreviewModal.classList.add('flex');
};

if (previewModalIframe) {
  previewModalIframe.addEventListener('load', () => {
    if (previewModalLoading) previewModalLoading.classList.add('hidden');
  });
}

// Fullscreen Toggle logic
const toggleFullscreenBtn = document.getElementById('toggleFullscreenBtn');
const fullscreenIconExpand = document.getElementById('fullscreenIconExpand');
const fullscreenIconCollapse = document.getElementById('fullscreenIconCollapse');
const previewModalContainer = resourcePreviewModal ? resourcePreviewModal.querySelector('.glass-card') : null;

let isFullscreen = false;

if (toggleFullscreenBtn && previewModalContainer) {
  toggleFullscreenBtn.addEventListener('click', () => {
    isFullscreen = !isFullscreen;
    
    if (isFullscreen) {
      previewModalContainer.className = "glass-card w-full max-w-full h-screen rounded-none overflow-hidden border-0 flex flex-col";
      fullscreenIconExpand.classList.add('hidden');
      fullscreenIconCollapse.classList.remove('hidden');
    } else {
      previewModalContainer.className = "glass-card w-full max-w-5xl rounded-3xl overflow-hidden border border-white/10 flex flex-col h-[85vh]";
      fullscreenIconExpand.classList.remove('hidden');
      fullscreenIconCollapse.classList.add('hidden');
    }
  });
}

if (closePreviewModalBtn) {
  closePreviewModalBtn.addEventListener('click', () => {
    if (resourcePreviewModal) {
      resourcePreviewModal.classList.add('hidden');
      resourcePreviewModal.classList.remove('flex');
    }
    if (previewModalIframe) previewModalIframe.src = '';
    
    // Reset fullscreen state on close
    isFullscreen = false;
    if (previewModalContainer) {
      previewModalContainer.className = "glass-card w-full max-w-5xl rounded-3xl overflow-hidden border border-white/10 flex flex-col h-[85vh]";
    }
    if (fullscreenIconExpand && fullscreenIconCollapse) {
      fullscreenIconExpand.classList.remove('hidden');
      fullscreenIconCollapse.classList.add('hidden');
    }
  });
}

// 1. Check for token in URL hash on load
if (window.location.hash.includes('access_token=')) {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const token = params.get('access_token');
  if (token) {
    sessionStorage.setItem('gdrive_token', token);
    history.replaceState(null, '', window.location.pathname);
    showToast('Google Drive connected!', 'success');
  }
}

// Update UI based on token
const updateDriveUI = () => {
  if (!googleLoginBtn) return;
  const token = sessionStorage.getItem('gdrive_token');
  if (token) {
    googleLoginBtn.classList.add('hidden');
    driveUploadSection.classList.remove('hidden');
    driveUploadSection.classList.add('flex');
  } else {
    googleLoginBtn.classList.remove('hidden');
    driveUploadSection.classList.add('hidden');
    driveUploadSection.classList.remove('flex');
  }
};

if (googleLoginBtn) {
  googleLoginBtn.addEventListener('click', () => {
    console.log('Connect Google Drive button clicked!');
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI || (window.location.origin + '/');
    
    console.log('Client ID:', clientId);
    console.log('Redirect URI:', redirectUri);

    if (!clientId || !redirectUri) {
      showToast(`Missing configuration. Client ID: ${clientId ? 'OK' : 'MISSING'}, Redirect URI: ${redirectUri ? 'OK' : 'MISSING'}`, 'error');
      return;
    }

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=token` +
      `&scope=${encodeURIComponent('https://www.googleapis.com/auth/drive')}` +
      `&prompt=consent`;
    
    console.log('Redirecting to Google OAuth URL:', authUrl);
    window.location.href = authUrl;
  });
}

if (googleLogoutBtn) {
  googleLogoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('gdrive_token');
    updateDriveUI();
    showToast('Google Drive disconnected!', 'info');
  });
}

// Helper to find or create a folder in Google Drive (Option 1: Smart Organizer)
const findOrCreateFolder = async (token, folderName, parentId = null) => {
  const sanitizedName = folderName.replace(/'/g, "\\'");
  const nameQuery = `(name = '${sanitizedName}' or name = '${sanitizedName.toLowerCase()}' or name = '${sanitizedName.toUpperCase()}')`;
  
  let queryStr = `mimeType = 'application/vnd.google-apps.folder' and ${nameQuery} and trashed = false`;
  if (parentId) {
    queryStr += ` and '${parentId}' in parents`;
  }
  
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(queryStr)}&fields=files(id,name)&includeItemsFromAllDrives=true&supportsAllDrives=true`;
  const searchRes = await fetch(searchUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!searchRes.ok) {
    throw new Error(`Failed to search for folder "${folderName}"`);
  }
  
  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    console.log(`Resolved existing folder: ${folderName} -> ID: ${searchData.files[0].id}`);
    return searchData.files[0].id;
  }
  
  // Create if not found
  console.log(`Folder not found. Creating folder: ${folderName}`);
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : []
    })
  });
  
  if (!createRes.ok) {
    throw new Error(`Failed to create folder "${folderName}"`);
  }
  
  const createData = await createRes.json();
  return createData.id;
};

if (uploadDriveBtn) {
  uploadDriveBtn.addEventListener('click', async () => {
    const file = topicResourceFile.files[0];
    if (!file) return showToast('Please select a file to upload', 'warn');

    const token = sessionStorage.getItem('gdrive_token');
    if (!token) return showToast('Not authenticated with Google Drive', 'error');

    // Get the subject name to organize the folder
    const subjectName = topicSubject.value.trim() || 'General';

    uploadDriveBtn.disabled = true;
    uploadDriveBtn.innerHTML = '<span class="animate-pulse">Organizing folders & uploading...</span>';

    try {
      // 1. Resolve 'Lessons' parent folder
      const lessonsFolderId = await findOrCreateFolder(token, 'Lessons');

      // 2. Resolve matching Subject subfolder inside 'Lessons'
      const subjectFolderId = await findOrCreateFolder(token, subjectName, lessonsFolderId);

      // 3. Prepare file metadata with parent folder set to the subject folder
      const metadata = {
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        parents: [subjectFolderId]
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', file);

      // 4. Upload file into the resolved folder path
      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: form
      });

      if (!res.ok) {
        if (res.status === 401) {
          sessionStorage.removeItem('gdrive_token');
          updateDriveUI();
          throw new Error('Google Drive session expired. Please reconnect.');
        }
        throw new Error('Failed to upload file to Google Drive');
      }

      const data = await res.json();
      const fileId = data.id;

      // 5. Make public reader
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone'
        })
      });

      // 6. Fill the link
      topicResourceLink.value = `https://drive.google.com/file/d/${fileId}/view`;
      
      // 7. Clean filename to auto-populate Topic Title
      const cleanTitle = file.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[_-]/g, " ")
        .replace(/\b\w/g, c => c.toUpperCase());
      if (topicTitle) topicTitle.value = cleanTitle;
      
      // 8. Resolve Subject
      const resolvedSubject = topicSubject.value.trim() || subjectName || 'General';
      if (topicSubject && !topicSubject.value.trim()) {
        topicSubject.value = resolvedSubject === 'General' ? '' : resolvedSubject;
      }

      // 9. Trigger AI Assist to automatically write Objectives and Legacy Notes!
      runAIAssist(cleanTitle, resolvedSubject);

      showToast(`Uploaded "${file.name}" & auto-generated curriculum!`, 'success');
      topicResourceFile.value = ''; // clear file input

    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
    } finally {
      uploadDriveBtn.disabled = false;
      uploadDriveBtn.textContent = 'Upload & Organize';
    }
  });
}

// Lesson Browser Logic (Select Existing Files)
if (closeGdriveBrowserBtn) {
  closeGdriveBrowserBtn.addEventListener('click', () => {
    gdriveBrowserModal.classList.add('hidden');
    gdriveBrowserModal.classList.remove('flex');
  });
}

const showEmptyBrowserState = (subject, isFolder = false) => {
  gdriveBrowserLoading.classList.add('hidden');
  gdriveFilesContainer.classList.add('hidden');
  gdriveBrowserEmpty.classList.remove('hidden');
  gdriveBrowserEmpty.classList.add('flex');
  gdriveBrowserEmptyMsg.textContent = isFolder 
    ? `Create some subfolders inside your "Lessons" folder on Google Drive to see them here!`
    : `Put some files under your Google Drive folder "Lessons > ${subject}" to see and select them here!`;
};

const getFileIcon = (mimeType) => {
  if (mimeType.includes('pdf')) {
    return `<svg class="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`;
  } else if (mimeType.includes('word') || mimeType.includes('document')) {
    return `<svg class="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>`;
  } else if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
    return `<svg class="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21h8M12 17V3"/></svg>`;
  } else if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    return `<svg class="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>`;
  } else if (mimeType.includes('image')) {
    return `<svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`;
  } else {
    return `<svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>`;
  }
};

const listLessonsFolders = async (token) => {
  gdriveBrowserSubtitle.textContent = 'Lessons';
  gdriveBrowserLoading.classList.remove('hidden');
  gdriveBrowserEmpty.classList.add('hidden');
  gdriveFilesContainer.classList.add('hidden');
  gdriveFilesContainer.innerHTML = '';
  if (gdriveBrowserBackBtn) gdriveBrowserBackBtn.classList.add('hidden');

  try {
    const lessonsFolderId = await findOrCreateFolder(token, 'Lessons');

    // Query folders inside Lessons
    const queryStr = `mimeType = 'application/vnd.google-apps.folder' and '${lessonsFolderId}' in parents and trashed = false`;
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(queryStr)}&fields=files(id,name)&orderBy=name&includeItemsFromAllDrives=true&supportsAllDrives=true`;
    const res = await fetch(searchUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) throw new Error('Failed to retrieve subject folders from Google Drive');

    const data = await res.json();
    if (!data.files || data.files.length === 0) {
      showEmptyBrowserState('Lessons', true);
      return;
    }

    gdriveBrowserLoading.classList.hidden = true;
    gdriveBrowserLoading.classList.add('hidden');
    gdriveFilesContainer.classList.remove('hidden');

    data.files.forEach(folder => {
      const li = document.createElement('li');
      li.className = 'flex items-center justify-between p-3.5 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.08] hover:border-white/10 transition-all cursor-pointer group';
      
      li.innerHTML = `
        <div class="flex items-center gap-3.5 min-w-0 flex-1">
          <div class="flex-shrink-0 p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-all">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-bold text-white truncate group-hover:text-emerald-400 transition-colors">${folder.name}</p>
            <p class="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">FOLDER</p>
          </div>
        </div>
        <svg class="w-5 h-5 text-slate-600 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all opacity-0 group-hover:opacity-100 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
      `;

      li.addEventListener('click', () => {
        listLessonsFilesInFolder(token, folder.id, folder.name);
      });

      gdriveFilesContainer.appendChild(li);
    });

  } catch (err) {
    console.error(err);
    showToast(err.message, 'error');
    gdriveBrowserLoading.classList.add('hidden');
  }
};

const listLessonsFilesInFolder = async (token, folderId, folderName) => {
  gdriveBrowserSubtitle.textContent = `Lessons > ${folderName}`;
  gdriveBrowserLoading.classList.remove('hidden');
  gdriveBrowserEmpty.classList.add('hidden');
  gdriveFilesContainer.classList.add('hidden');
  gdriveFilesContainer.innerHTML = '';
  if (gdriveBrowserBackBtn) gdriveBrowserBackBtn.classList.remove('hidden');

  try {
    const filesUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,webViewLink)&orderBy=name&includeItemsFromAllDrives=true&supportsAllDrives=true`;
    const res = await fetch(filesUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) throw new Error(`Failed to retrieve files for subject "${folderName}"`);

    const data = await res.json();
    if (!data.files || data.files.length === 0) {
      showEmptyBrowserState(folderName);
      return;
    }

    gdriveBrowserLoading.classList.add('hidden');
    gdriveFilesContainer.classList.remove('hidden');

    data.files.forEach(file => {
      const li = document.createElement('li');
      li.className = 'flex items-center justify-between p-3.5 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.08] hover:border-white/10 transition-all cursor-pointer group';
      
      li.innerHTML = `
        <div class="flex items-center gap-3.5 min-w-0 flex-1">
          <div class="flex-shrink-0 p-2 rounded-xl bg-white/5 group-hover:bg-white/10 transition-all">
            ${getFileIcon(file.mimeType)}
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-bold text-white truncate group-hover:text-emerald-400 transition-colors">${file.name}</p>
            <p class="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">${file.mimeType.split('/').pop().toUpperCase()}</p>
          </div>
        </div>
        <svg class="w-5 h-5 text-slate-600 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all opacity-0 group-hover:opacity-100 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
      `;

      li.addEventListener('click', async () => {
        li.classList.add('pointer-events-none', 'opacity-65');
        const titleEl = li.querySelector('p');
        const originalTitle = titleEl.textContent;
        titleEl.textContent = 'Connecting...';

        try {
          try {
            await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}/permissions`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                role: 'reader',
                type: 'anyone'
              })
            });
          } catch (permErr) {
            console.warn('Sharing permission update failed:', permErr);
          }

          // 1. Fill input field
          topicResourceLink.value = file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`;
          
          // 2. Clean filename to auto-populate Topic Title
          const cleanTitle = file.name
            .replace(/\.[^/.]+$/, "")
            .replace(/[_-]/g, " ")
            .replace(/\b\w/g, c => c.toUpperCase());
          if (topicTitle) topicTitle.value = cleanTitle;
          
          // 3. Resolve Subject subfolder (auto-map to folderName!)
          if (topicSubject) topicSubject.value = folderName;

          // 4. Trigger AI assist
          runAIAssist(cleanTitle, folderName);
          
          showToast(`Attached "${file.name}" & auto-generated curriculum!`, 'success');
          
          gdriveBrowserModal.classList.add('hidden');
          gdriveBrowserModal.classList.remove('flex');
        } catch (err) {
          console.error(err);
          titleEl.textContent = originalTitle;
          li.classList.remove('pointer-events-none', 'opacity-65');
          showToast('Failed to select file. Please check permissions.', 'error');
        }
      });

      gdriveFilesContainer.appendChild(li);
    });

  } catch (err) {
    console.error(err);
    showToast(err.message, 'error');
    gdriveBrowserLoading.classList.add('hidden');
  }
};

if (gdriveBrowserBackBtn) {
  gdriveBrowserBackBtn.addEventListener('click', () => {
    const token = sessionStorage.getItem('gdrive_token');
    if (token) {
      listLessonsFolders(token);
    }
  });
}

if (browseDriveBtn) {
  browseDriveBtn.addEventListener('click', async () => {
    const token = sessionStorage.getItem('gdrive_token');
    if (!token) return showToast('Not authenticated with Google Drive', 'error');

    const subjectName = topicSubject.value.trim();

    gdriveBrowserModal.classList.remove('hidden');
    gdriveBrowserModal.classList.add('flex');

    if (subjectName) {
      // Try to resolve this subject directly first
      gdriveBrowserSubtitle.textContent = `Lessons > ${subjectName}`;
      gdriveBrowserLoading.classList.remove('hidden');
      gdriveBrowserEmpty.classList.add('hidden');
      gdriveFilesContainer.classList.add('hidden');
      gdriveFilesContainer.innerHTML = '';
      if (gdriveBrowserBackBtn) gdriveBrowserBackBtn.classList.remove('hidden');

      try {
        const lessonsFolderId = await findOrCreateFolder(token, 'Lessons');
        const sanitizedSubject = subjectName.replace(/'/g, "\\'");
        const queryStr = `mimeType = 'application/vnd.google-apps.folder' and (name = '${sanitizedSubject}' or name = '${sanitizedSubject.toLowerCase()}' or name = '${sanitizedSubject.toUpperCase()}') and '${lessonsFolderId}' in parents and trashed = false`;
        const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(queryStr)}&fields=files(id,name)&includeItemsFromAllDrives=true&supportsAllDrives=true`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.files && searchData.files.length > 0) {
            // Found matching folder!
            listLessonsFilesInFolder(token, searchData.files[0].id, searchData.files[0].name);
            return;
          }
        }
        // If not found, list folders
        listLessonsFolders(token);
      } catch (err) {
        listLessonsFolders(token);
      }
    } else {
      // List folders at top-level
      listLessonsFolders(token);
    }
  });
}

// Init
updateAuthUI();
updateDriveUI();
setActiveTab('students');
topicDate.value = new Date().toISOString().split('T')[0];
sessionDate.value = new Date().toISOString().split('T')[0];
attendanceDateFilter.value = new Date().toISOString().split('T')[0];

