import '@modules/themes/resources/css/app.css';
import { registerGlobalComponent } from '@saucebase/react/lib/globalComponents';
import ThemePanel from './components/ThemePanel';

export function setup() {
    registerGlobalComponent('top', ThemePanel);
}
