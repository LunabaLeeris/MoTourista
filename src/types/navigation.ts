// Route parameter list definitions for application navigation.

export type MainTabParamList = {
  Profile: undefined;
  Visit: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Onboarding: { isEditing?: boolean } | undefined;
  MainTabs: undefined;
  ProfilePreview?: undefined;
  EditProfile: undefined;
};

