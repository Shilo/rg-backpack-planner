export type ActionSheetChoiceTone =
    | "orange"
    | "blue"
    | "yellow"
    | "danger";

export type ActionSheetChoice = {
    id: string | number;
    label: string;
    description: string;
    descriptionPrefix?: string;
    descriptionAmount?: string;
    descriptionSuffix?: string;
    tone: ActionSheetChoiceTone;
    disabled?: boolean;
};
