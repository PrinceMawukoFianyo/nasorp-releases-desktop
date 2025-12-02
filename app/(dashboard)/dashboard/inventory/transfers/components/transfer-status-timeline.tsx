import { CheckCircle, Clock, Package, XCircle } from "lucide-react"

export interface TimelineEvent {
  status: "CREATED" | "APPROVED" | "IN_TRANSIT" | "COMPLETED" | "CANCELLED";
  label: string;
  description: string;
  date?: string;
  completed: boolean;
  current: boolean;
}

interface TransferStatusTimelineProps {
  events: TimelineEvent[];
}

export function TransferStatusTimeline({ events }: TransferStatusTimelineProps) {
  const getIcon = (status: string, completed: boolean, current: boolean) => {
    const baseClasses = "w-10 h-10 rounded-full flex items-center justify-center"
    
    if (status === "CANCELLED") {
      return (
        <div className={`${baseClasses} bg-red-500`}>
          <XCircle className="w-5 h-5 text-white" />
        </div>
      )
    }

    if (status === "CREATED") {
      return (
        <div className={`${baseClasses} ${completed ? "bg-green-500" : current ? "bg-blue-500" : "bg-gray-300"}`}>
          <Clock className="w-5 h-5 text-white" />
        </div>
      )
    }

    if (status === "APPROVED") {
      return (
        <div className={`${baseClasses} ${completed ? "bg-green-500" : current ? "bg-blue-500" : "bg-gray-300"}`}>
          <CheckCircle className="w-5 h-5 text-white" />
        </div>
      )
    }

    if (status === "IN_TRANSIT") {
      return (
        <div className={`${baseClasses} ${completed ? "bg-green-500" : current ? "bg-blue-500" : "bg-gray-300"}`}>
          <Package className="w-5 h-5 text-white" />
        </div>
      )
    }

    return (
      <div className={`${baseClasses} ${completed ? "bg-green-500" : "bg-gray-300"}`}>
        <CheckCircle className="w-5 h-5 text-white" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-6 text-gray-900">Transfer Status</h3>

      <div className="space-y-0">
        {events.map((event, index) => (
          <div key={event.status} className="flex gap-4">
            {/* Icon and connecting line */}
            <div className="flex flex-col items-center">
              {getIcon(event.status, event.completed, event.current)}
              {index < events.length - 1 && (
                <div
                  className={`w-1 flex-1 my-2 ${event.completed ? "bg-green-500" : "bg-gray-300"}`}
                  style={{ minheight: "40px" }}
                />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className={`font-semibold ${
                    event.completed ? "text-green-700" : 
                    event.current ? "text-blue-700" : 
                    "text-gray-500"
                  }`}>
                    {event.label}
                  </h4>
                  <p className={`text-sm ${
                    event.completed ? "text-green-600" : 
                    event.current ? "text-blue-600" : 
                    "text-gray-400"
                  }`}>
                    {event.description}
                  </p>
                </div>
                {event.date && (
                  <span className={`text-sm ${
                    event.completed ? "text-green-600" : 
                    event.current ? "text-blue-600" : 
                    "text-gray-400"
                  }`}>
                    {event.date}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}