"use strict";

const CATEGORIES = ['Proteínas', 'Carboidratos', 'Frutas', 'Vegetais', 'Laticínios', 'Gorduras e óleos', 'Doces e bebidas', 'Outros'];

const state = {
  session: null, profile: null, isAdmin: false,
  foods: [], entries: [], history: [],
  tab: 'hoje', foodQuery: '', foodCat: 'Todos',
  adminOpen: false, editingFoodId: null, confirmDeleteId: null,
  authMode: 'login', authError: '', busy: false,
  users: [], usersLoading: false, usersLoadError: null,
  passwordEditId: null, confirmDeleteUserId: null
};

// state for the "add food to today" inline picker (js/entries.js)
let addPanelState = { query: '', qty: {} };

const appEl = document.getElementById('app');
const viewerBox = document.getElementById('viewerBox');
