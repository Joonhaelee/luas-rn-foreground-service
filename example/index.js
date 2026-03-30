import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';
import { RNForegroundServiceManager } from '@luas/rn-foreground-service';

RNForegroundServiceManager.registerHeadlessTask();

AppRegistry.registerComponent(appName, () => App);
