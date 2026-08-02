import { generateNavigation } from "@flaner/shared/utils";
import { MFE_NAMES } from "@flaner/shared/constants";
import { routes } from './routes';

export const navigation = generateNavigation(routes, `/${MFE_NAMES.SETTINGS}`);
