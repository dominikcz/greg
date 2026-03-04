import { createApp } from 'vue';
import App from './App.vue';

// #region setup
const app = createApp(App);

app.mount('#app');
// #endregion setup

export function greet(name) {
    return `Hello, ${name}!`;
}

export function add(a, b) {
    return a + b;
}

export function multiply(a, b) {
    return a * b;
}

export function divide(a, b) {
    if (b === 0) throw new Error('Division by zero');
    return a / b;
}

export function subtract(a, b) {
    return a - b;
}
