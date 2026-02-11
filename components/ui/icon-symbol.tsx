// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "book.fill": "menu-book",
  "arrow.clockwise": "refresh",
  "person.fill": "person",
  "camera.fill": "camera-alt",
  "doc.fill": "description",
  "folder.fill": "folder",
  "clock.fill": "schedule",
  "star.fill": "star",
  "checkmark.circle.fill": "check-circle",
  "xmark.circle.fill": "cancel",
  "gear": "settings",
  "magnifyingglass": "search",
  "plus": "add",
  "trash.fill": "delete",
  "square.and.arrow.up": "share",
  "bolt.fill": "bolt",
  "flame.fill": "local-fire-department",
  "brain": "psychology",
  "lightbulb.fill": "lightbulb",
  "questionmark.circle.fill": "help",
  "arrow.left": "arrow-back",
  "arrow.right": "arrow-forward",
  "eye.fill": "visibility",
  "lock.fill": "lock",
  "crown.fill": "workspace-premium",
  "photo.fill": "photo-library",
} as IconMapping;

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
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
