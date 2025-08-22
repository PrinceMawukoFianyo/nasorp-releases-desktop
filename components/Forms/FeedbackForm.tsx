// components/forms/FeedbackForm.tsx
"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import toast from "react-hot-toast";
import { useState } from "react";
import { createFeedback } from "@/actions/feedback";
import SubmitButton from "../FormInputs/SubmitButton";

const feedbackSchema = z.object({
  type: z.enum(["BUG", "FEATURE_REQUEST", "IMPROVEMENT", "THANKS", "OTHER"]),
  title: z.string().min(3, "Title must be at least 3 characters"),
  userId: z.string(),
  content: z.string().min(10, "Please provide more details"),
});

type FeedbackFormValues = z.infer<typeof feedbackSchema>;

export function FeedbackForm({ userId }: { userId: string }) {
  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      type: "FEATURE_REQUEST",
      title: "",
      content: "",
      userId: userId,
    },
  });
  const [loading, setLoading] = useState(false);
  async function onSubmit(data: FeedbackFormValues) {
    try {
      setLoading(true);
      data.userId = userId;
      const result = await createFeedback(data);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Feedback submitted successfully and pending review");
      form.reset();
      setLoading(false);
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Feedback</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Feedback Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select feedback type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="BUG">Bug Report</SelectItem>
                      <SelectItem value="FEATURE_REQUEST">
                        Feature Request
                      </SelectItem>
                      <SelectItem value="IMPROVEMENT">
                        Improvement Suggestion
                      </SelectItem>
                      <SelectItem value="THANKS">Thanks</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Brief description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Details</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Please provide more details about your feedback..."
                      className="min-h-[150px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <SubmitButton
              loadingTitle="Submitting..."
              loading={loading}
              title="Submit Feedback"
            />
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
