export const recoveryKeyUnlockFormStyles = {
  form: "space-y-4",
  // `FormTextField` puts `className` on the field wrapper: style only the input, not the label / hint / error
  key: "[&_input]:font-mono [&_input]:uppercase",
  submit: "w-full",
  link: "h-auto w-full whitespace-normal",
  lostBoth: "text-center text-sm text-muted-foreground",
  resetLink: "h-auto p-0 text-destructive",
};
