import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import { auth, storage, db } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, User } from 'lucide-react';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = authSchema.extend({
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  profilePicture: z.instanceof(FileList).optional(),
});

const resetSchema = z.object({
  email: z.string().email(),
});

export function AuthForm() {
  const [error, setError] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();
  
  const { register: registerAuth, handleSubmit: handleAuthSubmit, formState: { errors: authErrors } } = useForm({
    resolver: zodResolver(authSchema),
  });

  const { register: registerReset, handleSubmit: handleResetSubmit, formState: { errors: resetErrors }, reset: resetForm } = useForm({
    resolver: zodResolver(resetSchema),
  });

  const { register: registerSignUp, handleSubmit: handleSignUpSubmit, formState: { errors: signUpErrors }, watch } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const profilePicture = watch('profilePicture');

  // Handle profile picture preview
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

  const onSubmit = async (data: z.infer<typeof authSchema>, isLogin: boolean) => {
    try {
      setError('');
      if (isLogin) {
        await signInWithEmailAndPassword(auth, data.email, data.password);
      } else {
        await signInWithEmailAndPassword(auth, data.email, data.password);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const onRegister = async (data: z.infer<typeof registerSchema>) => {
    if (!auth.currentUser && !data.email && !data.password) return;
    
    try {
      setError('');
      setIsRegistering(true);

      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      let photoURL = '';

      // Upload profile picture if provided
      if (data.profilePicture?.[0]) {
        const file = data.profilePicture[0];
        const storageRef = ref(storage, `profile-pictures/${user.uid}/${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        photoURL = await getDownloadURL(snapshot.ref);
      }

      // Update profile
      await updateProfile(user, {
        displayName: data.displayName,
        photoURL: photoURL || null,
      });

      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        displayName: data.displayName,
        photoURL: photoURL || null,
        createdAt: new Date(),
      });

    } catch (err) {
      setError(err.message);
      toast({
        title: "Registration Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const onReset = async (data: z.infer<typeof resetSchema>) => {
    try {
      setError('');
      setIsResetting(true);
      await sendPasswordResetEmail(auth, data.email);
      toast({
        title: "Reset Email Sent",
        description: "Check your email for password reset instructions.",
      });
      setIsResetting(false);
      setResetDialogOpen(false);
      resetForm();
    } catch (err) {
      setError(err.message);
      setIsResetting(false);
    }
  };

  return (
    <Card className="w-[350px] mx-auto mt-20">
      <CardHeader>
        <CardTitle>Pain Tracker</CardTitle>
        <CardDescription>Track and visualize your pain levels over time</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="login">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <form onSubmit={handleAuthSubmit((data) => onSubmit(data, true))}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...registerAuth('email')} />
                  {authErrors.email && <p className="text-red-500 text-sm">{authErrors.email.message}</p>}
                </div>
                
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" {...registerAuth('password')} />
                  {authErrors.password && <p className="text-red-500 text-sm">{authErrors.password.message}</p>}
                </div>

                {error && <p className="text-red-500 text-sm">{error}</p>}
                
                <Button type="submit" className="w-full">Login</Button>

                <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="link" className="w-full text-sm text-muted-foreground hover:text-primary">
                      Forgot your password?
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Reset Password</DialogTitle>
                      <DialogDescription>
                        Enter your email address and we'll send you a link to reset your password.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleResetSubmit(onReset)} className="space-y-4">
                      <div>
                        <Label htmlFor="reset-email">Email</Label>
                        <Input id="reset-email" type="email" {...registerReset('email')} />
                        {resetErrors.email && <p className="text-red-500 text-sm">{resetErrors.email.message}</p>}
                      </div>

                      {error && <p className="text-red-500 text-sm">{error}</p>}
                      
                      <Button type="submit" className="w-full" disabled={isResetting}>
                        {isResetting ? 'Sending Reset Email...' : 'Send Reset Email'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </form>
          </TabsContent>
          
          <TabsContent value="register">
            <form onSubmit={handleSignUpSubmit(onRegister)} className="space-y-4">
              <div className="flex flex-col items-center gap-4 mb-4">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={previewUrl || ''} />
                  <AvatarFallback>
                    <User className="w-12 h-12 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept={ACCEPTED_IMAGE_TYPES.join(',')}
                    className="hidden"
                    {...registerSignUp('profilePicture', {
                      onChange: handleProfilePictureChange,
                    })}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Picture
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="displayName">Full Name</Label>
                <Input id="displayName" {...registerSignUp('displayName')} />
                {signUpErrors.displayName && (
                  <p className="text-red-500 text-sm">{signUpErrors.displayName.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="register-email">Email</Label>
                <Input id="register-email" type="email" {...registerSignUp('email')} />
                {signUpErrors.email && <p className="text-red-500 text-sm">{signUpErrors.email.message}</p>}
              </div>
              
              <div>
                <Label htmlFor="register-password">Password</Label>
                <Input id="register-password" type="password" {...registerSignUp('password')} />
                {signUpErrors.password && <p className="text-red-500 text-sm">{signUpErrors.password.message}</p>}
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}
              
              <Button type="submit" className="w-full" disabled={isRegistering}>
                {isRegistering ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}