// components/forms/ChangelogForm.tsx
"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

import toast from "react-hot-toast";
// import Editor from "../FormInputs/SimpleEditor";
import { useState } from "react";
import { createChangelog } from "@/actions/feedback";
import Editor from "../FormInputs/SimpleEditor";

const changelogSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  version: z.string().min(1, "Version is required"),
  content: z.string().min(10, "Content must be at least 10 characters"),
  isPublished: z.boolean().default(false),
});

type ChangelogFormValues = z.infer<typeof changelogSchema>;

export function ChangelogForm() {
  const form = useForm<ChangelogFormValues>({
    resolver: zodResolver(changelogSchema),
    defaultValues: {
      title: "",
      version: "",
      content: "",
      isPublished: false,
    },
  });
  const [loading, setLoading] = useState(false);
  async function onSubmit(data: ChangelogFormValues) {
    setLoading(true);
    try {
      const result = await createChangelog(data);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Changelog Created Successfully");
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
        <CardTitle>Create Changelog</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="New Features Release" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="version"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Version</FormLabel>
                  <FormControl>
                    <Input placeholder="v1.0.0" {...field} />
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
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Editor value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isPublished"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Publish</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Make this changelog visible to users
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button type="submit" size="lg" disabled={loading}>
              {loading ? "Creating..." : "Create Changelog"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
