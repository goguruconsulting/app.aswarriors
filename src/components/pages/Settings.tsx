import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { auth, db, storage } from '@/lib/firebase';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, User } from 'lucide-react';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const settingsSchema = z.object({
  displayName: z.string().min(2).max(50),
  profilePicture: z.instanceof(FileList).optional(),
});

export function Settings() {
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const user = auth.currentUser;

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      displayName: user?.displayName || '',
    },
  });

  const profilePicture = watch('profilePicture');

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) return;

      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setValue('displayName', data.displayName || user.displayName || '');
          setPreviewUrl(data.photoURL || user.photoURL || null);
        } else {
          await setDoc(docRef, {
            email: user.email,
            displayName: user.displayName || '',
            photoURL: user.photoURL || null,
            createdAt: new Date(),
          });
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
        toast({
          title: "Error",
          description: "Failed to load profile. Please try again.",
          variant: "destructive",
        });
      }
    };

    loadUserProfile();
  }, [user, setValue, toast]);

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: "Profile picture must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a valid image file (JPEG, PNG, WebP)",
        variant: "destructive",
      });
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const onSubmit = async (data: z.infer<typeof settingsSchema>) => {
    if (!user) return;

    setLoading(true);
    try {
      let photoURL = user.photoURL;

      // Upload new profile picture if provided
      if (data.profilePicture?.[0]) {
        const file = data.profilePicture[0];
        const storageRef = ref(storage, `profile-pictures/${user.uid}/${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        photoURL = await getDownloadURL(snapshot.ref);
      }

      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: data.displayName,
        photoURL: photoURL,
      });

      // Update Firestore document
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        displayName: data.displayName,
        photoURL: photoURL,
        updatedAt: new Date(),
      }, { merge: true });

      toast({
        title: "Settings Updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <main className="flex-1 container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>
            Manage your profile settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="w-32 h-32">
                <AvatarImage src={previewUrl || ''} />
                <AvatarFallback>
                  <User className="w-16 h-16 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept={ACCEPTED_IMAGE_TYPES.join(',')}
                  className="hidden"
                  {...register('profilePicture', {
                    onChange: handleProfilePictureChange,
                  })}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Change Picture
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user.email || ''}
                  disabled
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  {...register('displayName')}
                  className="mt-1"
                />
                {errors.displayName && (
                  <p className="text-sm text-destructive mt-1">{errors.displayName.message}</p>
                )}
              </div>
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}