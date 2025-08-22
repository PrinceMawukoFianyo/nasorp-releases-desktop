"use client";
import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Clock, ArrowRight, User, Tag } from "lucide-react";

// Types
interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  date: string;
  author: {
    name: string;
    image: string;
  };
  image: string;
  slug: string;
  featured?: boolean;
}

interface Category {
  label: string;
  value: string;
}

// Sample data
const categories: Category[] = [
  { label: "All", value: "all" },
  { label: "Web Development", value: "web-dev" },
  { label: "Design", value: "design" },
  { label: "Technology", value: "tech" },
  { label: "Business", value: "business" },
  { label: "Tutorial", value: "tutorial" },
];

const blogPosts: BlogPost[] = [
  {
    id: 1,
    title: "The Future of Web Development: What's Coming in 2025",
    excerpt:
      "Explore the upcoming trends and technologies that will shape the future of web development.",
    category: "web-dev",
    readTime: "5 min read",
    date: "Feb 14, 2025",
    author: {
      name: "Sarah Johnson",
      image:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&auto=format&fit=crop&q=60",
    },
    image:
      "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=800&auto=format&fit=crop&q=60",
    slug: "future-of-web-development",
    featured: true,
  },
  {
    id: 2,
    title: "Mastering Modern UI Design Principles",
    excerpt:
      "Learn the essential principles of modern UI design and how to apply them effectively.",
    category: "design",
    readTime: "4 min read",
    date: "Feb 12, 2025",
    author: {
      name: "Michael Chen",
      image:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&auto=format&fit=crop&q=60",
    },
    image:
      "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&auto=format&fit=crop&q=60",
    slug: "mastering-modern-ui-design",
  },
  {
    id: 3,
    title: "Building Scalable Applications with React",
    excerpt:
      "A comprehensive guide to building large-scale applications using React and best practices.",
    category: "tutorial",
    readTime: "7 min read",
    date: "Feb 10, 2025",
    author: {
      name: "David Wilson",
      image:
        "https://images.unsplash.com/photo-1463453091185-61582044d556?w=400&h=400&auto=format&fit=crop&q=60",
    },
    image:
      "https://images.unsplash.com/photo-1633356122102-3fe601e05bd2?w=800&auto=format&fit=crop&q=60",
    slug: "scalable-react-applications",
  },
  // Add more blog posts as needed
];

const BlogListing = () => {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filteredPosts =
    activeCategory === "all"
      ? blogPosts
      : blogPosts.filter((post) => post.category === activeCategory);

  const featuredPost = blogPosts.find((post) => post.featured);

  return (
    <section className="py-20 bg-gray-50 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Latest Insights & Articles
          </h1>
          <p className="text-xl text-gray-600">
            Stay updated with the latest trends, tutorials, and insights in web
            development and design.
          </p>
        </div>

        {/* Featured Post */}
        {featuredPost && (
          <div className="mb-16">
            <Link
              href={`/blog/${featuredPost.slug}`}
              className="group block relative rounded-2xl overflow-hidden"
            >
              <div className="aspect-[21/9] relative">
                <Image
                  src={featuredPost.image}
                  alt={featuredPost.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <span className="inline-block px-4 py-1 bg-blue-600 text-white text-sm rounded-full mb-4">
                  Featured Post
                </span>
                <h2 className="text-3xl font-bold text-white mb-4">
                  {featuredPost.title}
                </h2>
                <p className="text-gray-200 mb-4 max-w-2xl">
                  {featuredPost.excerpt}
                </p>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full overflow-hidden relative">
                      <Image
                        src={featuredPost.author.image}
                        alt={featuredPost.author.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <span className="text-white">
                      {featuredPost.author.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <Clock className="w-4 h-4" />
                    <span>{featuredPost.readTime}</span>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Categories */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {categories.map((category) => (
            <button
              key={category.value}
              onClick={() => setActiveCategory(category.value)}
              className={`
                px-6 py-2 rounded-full text-sm font-medium transition-all duration-300
                ${
                  activeCategory === category.value
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-100"
                }
              `}
            >
              {category.label}
            </button>
          ))}
        </div>

        {/* Blog Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPosts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
            >
              <div className="aspect-[16/9] relative">
                <Image
                  src={post.image}
                  alt={post.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                    {
                      categories.find((cat) => cat.value === post.category)
                        ?.label
                    }
                  </span>
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {post.readTime}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {post.title}
                </h3>
                <p className="text-gray-600 mb-4">{post.excerpt}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full overflow-hidden relative">
                      <Image
                        src={post.author.image}
                        alt={post.author.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <span className="text-sm text-gray-600">
                      {post.author.name}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">{post.date}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Load More */}
        <div className="text-center mt-12">
          <button className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-300">
            Load More Articles
            <ArrowRight className="ml-2 w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default BlogListing;
