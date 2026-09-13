import type { RedFlagSymptom } from "./types";

/**
 * Section 15: safety. Bloat is a wellness product, not a diagnostic tool.
 * When a user reports something outside the scope of "bloating," the
 * product's job is to point them toward appropriate medical care — not to
 * keep running pattern analysis or suggest another experiment.
 */

export const RED_FLAG_OPTIONS: { key: RedFlagSymptom; label: string }[] = [
  { key: "severe_persistent_pain", label: "Severe or persistent abdominal pain" },
  { key: "blood_in_stool", label: "Blood in stool" },
  { key: "repeated_vomiting", label: "Repeated vomiting" },
  { key: "unexplained_weight_loss", label: "Unexplained, significant weight loss" },
  { key: "fever", label: "Fever" },
  { key: "other_concerning", label: "Something else that feels concerning" },
];

export function hasRedFlags(redFlags: RedFlagSymptom[]): boolean {
  return redFlags.length > 0;
}

export const SAFETY_COPY = {
  title: "Let's make sure you get the right kind of help",
  body:
    "What you've described goes beyond everyday bloating, and it isn't something this app is designed to " +
    "evaluate. Please consider talking to a doctor or other qualified healthcare professional — especially if " +
    "this is new, severe, persistent, or getting worse.",
  cta: "Find care guidance",
  secondary: "I've logged this, continue",
  disclaimer: "Bloat can't diagnose conditions like IBS, SIBO, food intolerances, allergies, or celiac disease.",
};
