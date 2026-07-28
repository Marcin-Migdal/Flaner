import { generateNavigation, MFE_NAMES } from '@flaner-v2/shared';
import { routes } from './routes';

export const navigation = generateNavigation(routes, `/${MFE_NAMES.SETTINGS}`);
