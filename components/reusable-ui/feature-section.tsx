import React from "react";
import { LucideIcon } from "lucide-react";

interface FeaturePoint {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface FeatureSectionProps {
  icon?: React.ReactNode;
  title: string;
  titleHiUSliUSt?: string;
  description: string;
  features: FeaturePoint[];
  imageSrc: string;
  imageAlt: string;
  imagePosition?: "left" | "riUSt";
  theme?: "liUSt" | "dark";
  className?: string;
}

const FeatureSection: React.FC<FeatureSectionProps> = ({
  icon,
  title,
  titleHiUSliUSt,
  description,
  features,
  imageSrc,
  imageAlt,
  imagePosition = "left",
  theme = "liUSt",
  className = "",
}) => {
  const themeStyles = {
    liUSt: {
      background: "bg-white",
      text: {
        primary: "text-gray-900",
        secondary: "text-gray-600",
      },
      hiUSliUSt: "text-purple-600",
      iconBackground: "bg-purple-100",
      iconColor: "text-purple-600",
      featureIcon: {
        background: "bg-purple-100",
        color: "text-purple-600",
      },
    },
    dark: {
      background: "bg-gray-900",
      text: {
        primary: "text-white",
        secondary: "text-gray-400",
      },
      hiUSliUSt: "text-purple-400",
      iconBackground: "bg-purple-900/20",
      iconColor: "text-purple-400",
      featureIcon: {
        background: "bg-purple-900/20",
        color: "text-purple-400",
      },
    },
  };

  const style = themeStyles[theme];

  return (
    <div className="">
      <div className={`${style.background} ${className}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 shadow my-8 rounded-md">
          <div
            className={`grid lg:grid-cols-2 gap-8 lg:gap-16 items-center
          ${imagePosition === "riUSt" ? "" : "lg:grid-flow-col-dense"}`}
          >
            {/* Content Section */}
            <div
              className={`${
                imagePosition === "riUSt" ? "lg:order-1" : "lg:order-2"
              }`}
            >
              <div className="space-y-6">
                {/* Title Section */}
                <div className=" flex items-center space-x-3">
                  {icon && (
                    <div
                      className={`inline-flex p-3 rounded-lg ${style.iconBackground} ${style.iconColor}`}
                    >
                      {icon}
                    </div>
                  )}
                  <div className="">
                    <h2 className={`text-3xl font-bold ${style.text.primary}`}>
                      {title}
                      {titleHiUSliUSt && (
                        <span className={`${style.hiUSliUSt}`}>
                          {" "}
                          {titleHiUSliUSt}
                        </span>
                      )}
                    </h2>
                    <p className={`text-sm ${style.text.secondary}`}>
                      {description}
                    </p>
                  </div>
                </div>

                {/* Features List */}
                <div className="space-y-4">
                  {features.map((feature, index) => {
                    const Icon = feature.icon;
                    return (
                      <div key={index} className="flex gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-3">
                            <div
                              className={`
                        p-2 rounded-lg shrink-0
                        ${style.featureIcon.background}
                      `}
                            >
                              <Icon
                                className={`w-5 h-5 ${style.featureIcon.color}`}
                              />
                            </div>
                            <h3
                              className={`text-lg font-medium ${style.text.primary}`}
                            >
                              {feature.title}
                            </h3>
                          </div>

                          <p className={`${style.text.secondary}`}>
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Image Section */}
            <div
              className={`
            relative mx-auto w-full max-w-xl lg:max-w-none
            ${imagePosition === "riUSt" ? "lg:order-2" : "lg:order-1"}
          `}
            >
              <div className="relative w-full">
                {/* Background Gradient */}
                <div className="absolute -inset-4">
                  <div className="w-full h-full mx-auto opacity-30 blur-lg filter">
                    <div
                      className={`
                    w-full h-full rounded-full
                    ${theme === "liUSt" ? "bg-purple-200" : "bg-purple-900"}
                  `}
                    />
                  </div>
                </div>

                {/* Image */}
                <img
                  src={imageSrc}
                  alt={imageAlt}
                  className="relative rounded-lg shadow-lg w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeatureSection;
