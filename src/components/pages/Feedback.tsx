import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { auth, db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, CheckCircle2, X } from 'lucide-react';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const feedbackSchema = z.object({
  feedback: z.string().min(10, 'Feedback must be at least 10 characters long'),
});

type FeedbackForm = z.infer<typeof feedbackSchema>;

export function Feedback() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FeedbackForm>({
    resolver: zodResolver(feedbackSchema),
  });

  const validateFile = (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: `${file.name} is larger than 5MB`,
        variant: "destructive",
      });
      return false;
    }
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: `${file.name} is not a supported image type`,
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles: File[] = [];
    const newUrls: string[] = [];

    Array.from(files).forEach(file => {
      if (validateFile(file)) {
        if (selectedFiles.length + newFiles.length >= 3) {
          toast({
            title: "Too many files",
            description: "Maximum of 3 files allowed",
            variant: "destructive",
          });
          return;
        }
        newFiles.push(file);
        newUrls.push(URL.createObjectURL(file));
      }
    });

    setSelectedFiles(prev => [...prev, ...newFiles]);
    setPreviewUrls(prev => [...prev, ...newUrls]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: FeedbackForm) => {
    const user = auth.currentUser;
    if (!user) return;

    setIsSubmitting(true);
    try {
      let attachmentUrls: string[] = [];

      // Upload attachments if any
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          try {
            const storageRef = ref(storage, `feedback-attachments/${user.uid}/${Date.now()}-${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const url = await getDownloadURL(snapshot.ref);
            attachmentUrls.push(url);
          } catch (error) {
            console.error('Error uploading file:', error);
            toast({
              title: "Upload Failed",
              description: `Failed to upload ${file.name}`,
              variant: "destructive",
            });
          }
        }
      }

      // Save feedback to Firestore
      await addDoc(collection(db, 'feedback'), {
        userId: user.uid,
        userEmail: user.email,
        feedback: data.feedback,
        attachments: attachmentUrls,
        createdAt: Timestamp.fromDate(new Date()),
      });

      // Show success state
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);

      // Clean up
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      setSelectedFiles([]);
      setPreviewUrls([]);
      reset();

      toast({
        title: "Feedback Submitted",
        description: "Thank you for helping us improve the app!",
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex-1 container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Feedback</CardTitle>
          <CardDescription>
            Help us improve by sharing your thoughts and suggestions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="feedback">Your Feedback</Label>
              <Textarea
                id="feedback"
                placeholder="Share your experience, suggestions, or report issues..."
                className="min-h-[150px]"
                {...register('feedback')}
              />
              {errors.feedback && (
                <p className="text-sm text-destructive">{errors.feedback.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Attachments (Optional)</Label>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_IMAGE_TYPES.join(',')}
                  className="hidden"
                  onChange={handleFileChange}
                  multiple
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={selectedFiles.length >= 3}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Add Screenshots
                </Button>
                <p className="text-sm text-muted-foreground">
                  Max 3 files (5MB each)
                </p>
              </div>

              {/* Image Previews */}
              {previewUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-4 mt-4">
                  {previewUrls.map((url, index) => (
                    <div key={url} className="relative group">
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={isSubmitting}
            >
              {showSuccess ? (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Feedback Submitted
                </span>
              ) : isSubmitting ? (
                'Submitting...'
              ) : (
                'Submit Feedback'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}