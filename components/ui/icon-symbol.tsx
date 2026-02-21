// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight } from "expo-symbols";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";
import { ICON_SYMBOL_MAPPING, type IconSymbolName } from "@/components/ui/icon-symbol.mapping";

const FALLBACK_ICON_NAME = "help-outline";

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const materialName = ICON_SYMBOL_MAPPING[name] ?? FALLBACK_ICON_NAME;
  return <MaterialIcons color={color} size={size} name={materialName} style={style} />;
}
