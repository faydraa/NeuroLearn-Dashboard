import { useEffect, useState } from 'react';
import { User as UserIcon, Mail, Calendar, Users, BookOpen, Save, Camera, AlertCircle } from 'lucide-react';
import type { User } from '../App';
import { updateUserProfile } from '../library/profile';

type SettingsProps = {
  user: User;
  onUpdateProfile: (user: User) => void;
};

const AVATAR_OPTIONS = [
  '🧑🏻‍💻', '👩🏻‍💻', '🙆🏻‍♂️', '🙆🏻‍♀️', '👨🏻‍🎓', '👩🏻‍🎓', '🧑🏻‍🔬', '👩🏻‍🔬',
  '😊', '☺️', '😋', '🤓', '😎', '🤩', '😬', '🤠',
  '🐶', '🐱', '🐼', '🐨', '🦁', '🐵', '🐠', '🦖'
];

export function Settings({ user, onUpdateProfile }: SettingsProps) {
  const [formData, setFormData] = useState<User>({
    ...user,
    age: user.age || undefined,
    gender: user.gender || '',
    email: user.email || '',
    gradeLevel: user.gradeLevel || '',
    bio: user.bio || '',
  });

  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setFormData({
      ...user,
      age: user.age || undefined,
      gender: user.gender || '',
      email: user.email || '',
      gradeLevel: user.gradeLevel || '',
      bio: user.bio || '',
    });
  }, [user]);

  const handleChange = (field: keyof User, value: string | number | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setError('');
    setIsSaved(false);
    setIsSaving(true);

    try {
      const updatedProfile = await updateUserProfile(user.id, {
        full_name: formData.name?.trim() || user.name,
        avatar: formData.avatar || '🐼',
        age: formData.age ? Number(formData.age) : null,
        gender: formData.gender || null,
        grade_level: formData.gradeLevel || null,
        bio: formData.bio || null,
      });

      const updatedUser: User = {
        ...user,
        name: updatedProfile.full_name || user.name,
        avatar: updatedProfile.avatar || '🐼',
        age: updatedProfile.age ?? undefined,
        gender: updatedProfile.gender ?? undefined,
        gradeLevel: updatedProfile.grade_level ?? undefined,
        bio: updatedProfile.bio ?? undefined,
        email: user.email,
      };

      setFormData(updatedUser);
      onUpdateProfile(updatedUser);

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err: any) {
      console.error('Failed to save profile:', err);
      setError(err.message || 'Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : 'N/A';

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your profile and preferences</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
        {/* Avatar Section */}
        <div className="p-8 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Profile Picture</h2>
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 bg-indigo-600 rounded-full flex items-center justify-center text-5xl">
                {formData.avatar || <UserIcon className="w-12 h-12 text-white" />}
              </div>
              <button
                type="button"
                onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                className="absolute bottom-0 right-0 w-8 h-8 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 transition"
              >
                <Camera className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <div>
              <button
                type="button"
                onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                className="px-4 py-2 bg-indigo-100 text-indigo-600 rounded-lg font-medium hover:bg-indigo-200 transition"
              >
                Choose Avatar
              </button>
              <p className="text-sm text-gray-600 mt-2">Pick an avatar that represents you</p>
            </div>
          </div>

          {showAvatarPicker && (
            <div className="mt-6 p-4 bg-gray-50 rounded-xl">
              <p className="text-sm font-medium text-gray-700 mb-3">Select an avatar:</p>
              <div className="grid grid-cols-8 gap-2">
                {AVATAR_OPTIONS.map((avatar, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      handleChange('avatar', avatar);
                      setShowAvatarPicker(false);
                    }}
                    className={`w-12 h-12 rounded-lg text-2xl hover:bg-white transition ${
                      formData.avatar === avatar ? 'bg-white ring-2 ring-indigo-500' : 'bg-gray-100'
                    }`}
                  >
                    {avatar}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Personal Information */}
        <div className="p-8 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Personal Information</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4" />
                  Full Name
                </div>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </div>
              </label>
              <input
                type="email"
                value={formData.email || ''}
                readOnly
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed outline-none"
                placeholder="your.email@example.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                Email changes are not enabled here.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Age
                </div>
              </label>
              <input
                type="number"
                value={formData.age ?? ''}
                onChange={(e) =>
                  handleChange(
                    'age',
                    e.target.value === '' ? undefined : parseInt(e.target.value, 10)
                  )
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                placeholder="Enter your age"
                min="5"
                max="100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Gender
                </div>
              </label>
              <select
                value={formData.gender || ''}
                onChange={(e) => handleChange('gender', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Educational Level
                </div>
              </label>
              <select
                value={formData.gradeLevel || ''}
                onChange={(e) => handleChange('gradeLevel', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
              >
                <option value="">Select educational level</option>
                <option value="primary">Primary School (Pri 1–6)</option>
                <option value="secondary">Secondary School (Sec 1–4/5)</option>
                <option value="jc-poly-ite">Junior College (JC) / Polytechnic (Poly) / ITE</option>
                <option value="university">University (Undergraduate and above)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div className="p-8 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Account Information</h2>
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Username</p>
                <p className="font-medium text-gray-900">{user.username}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Account Type</p>
                <p className="font-medium text-gray-900">Student</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Member Since</p>
                <p className="font-medium text-gray-900">{memberSince}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="p-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              {isSaved && (
                <p className="text-sm text-green-600 font-medium">✓ Changes saved successfully!</p>
              )}
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 font-medium">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}