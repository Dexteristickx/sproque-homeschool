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
  activeTab: 'students',
  editingStudentId: null,
  editingTopicId: null,
  editingTopicStatus: 'Prepared',
  topicAssignedSet: new Set()
};

let unsubStudents = null;
let unsubTopics = null;
let unsubSessions = null;
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
  });
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
  }
});

signOutBtn.addEventListener('click', () => signOut(auth));

// Tab Switching
tabButtons.forEach(btn => btn.addEventListener('click', () => setActiveTab(btn.dataset.tab)));

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
