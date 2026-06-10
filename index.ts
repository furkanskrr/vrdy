import { registerRootComponent } from "expo";
import { sabitleMetinOlceklendirme } from "./src/lib/textScaling";

sabitleMetinOlceklendirme();

import { AppBootstrap } from "./src/components/AppBootstrap";

registerRootComponent(AppBootstrap);
