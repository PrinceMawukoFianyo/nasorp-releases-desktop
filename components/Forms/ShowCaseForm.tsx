// components/forms/ShowcaseForm.tsx
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

import { useState } from "react";
import { createShowcase } from "@/actions/showcases";
import toast from "react-hot-toast";
import SubmitButton from "../FormInputs/SubmitButton";

const MAX_FILE_SIZE = 5000000; // 5MB
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const showcaseSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(50, "Description must be at least 50 characters"),
  projectUrl: z.string().url().min(3, "Project Url is required"),
  githubUrl: z.string().url().optional().or(z.literal("")),
  imageUrl: z.string().min(3, "Project Screenshot is required"),
  technology: z.array(z.string()).min(1, "Add at least one technology"),
  userId: z.string(),
});

type ShowcaseFormValues = z.infer<typeof showcaseSchema>;

export function ShowcaseForm({ userId }: { userId: string }) {
  const [technologies, setTechnologies] = useState<string[]>([]);
  const [techInput, setTechInput] = useState("");

  const form = useForm<ShowcaseFormValues>({
    resolver: zodResolver(showcaseSchema),
    defaultValues: {
      title: "",
      description: "",
      projectUrl: "",
      githubUrl: "",
      imageUrl: "",
      technology: [],
      userId: userId, // Add this line
    },
  });

  const addTechnology = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && techInput.trim()) {
      e.preventDefault();
      if (!technologies.includes(techInput.trim())) {
        const updatedTech = [...technologies, techInput.trim()];
        setTechnologies(updatedTech);
        form.setValue("technology", updatedTech);
      }
      setTechInput("");
    }
  };

  const removeTechnology = (tech: string) => {
    const updatedTech = technologies.filter((t) => t !== tech);
    setTechnologies(updatedTech);
    form.setValue("technology", updatedTech);
  };
  const [loading, setLoading] = useState(false);
  async function onSubmit(data: ShowcaseFormValues) {
    if (loading) return;

    setLoading(true);
    try {
      // Ensure technology array is included
      const submitData = {
        ...data,
        userId,
        technology: technologies, // Make sure this is included
      };

      const result = await createShowcase(submitData);

      if (result.error) {
        toast.error(result.error);
        setLoading(false);
        return;
      }

      toast.success("Showcase submitted successfully and pending review");
      form.reset();
      setTechnologies([]);
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Something went wrong while submitting");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Your Project</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Title</FormLabel>
                  <FormControl>
                    <Input placeholder="My Awesome Project" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell us about your project..."
                      {...field}
                      className="min-h-[120px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="projectUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Live Project URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="githubUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GitHub URL (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://github.com/..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Screenshot URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="technology"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Technologies Used</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Type and press Enter to add"
                      value={techInput}
                      onChange={(e) => setTechInput(e.target.value)}
                      onKeyDown={addTechnology}
                    />
                  </FormControl>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {technologies.map((tech) => (
                      <Badge
                        key={tech}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {tech}
                        <X
                          className="w-3 h-3 cursor-pointer"
                          onClick={() => removeTechnology(tech)}
                        />
                      </Badge>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* <Button type="submit" size="lg">
              {loading ? "Submitting..." : "Submit Project"}
            </Button> */}
            <SubmitButton
              loadingTitle="Submitting..."
              title="Submit Project"
              loading={loading}
            />
            {/* <button>Submit</button> */}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
