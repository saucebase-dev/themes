import '@modules/themes/resources/css/app.css';
import { registerGlobalComponent } from '@saucebase/vue/lib/globalComponents';
import ThemePanel from './components/ThemePanel.vue';

export function setup() {
    registerGlobalComponent('app::page.before', ThemePanel);
}
