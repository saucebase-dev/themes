import { registerGlobalComponent } from '@/lib/globalComponents';
import ThemePanel from './components/ThemePanel.vue';
import '../css/app.css';

export function setup() {
    registerGlobalComponent('top', ThemePanel);
}

export function afterMount() {}
