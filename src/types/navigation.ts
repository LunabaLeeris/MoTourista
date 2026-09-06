// Route parameter list definitions for application navigation.

export type MainTabParamList = {
  Posts: undefined;
  Profile: undefined;
  Visit: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Onboarding: { isEditing?: boolean } | undefined;
  MainTabs: undefined;
  CreatePost: undefined;
  ProfilePreview?: undefined;
  EditProfile: undefined;
};

