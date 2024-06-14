export const toRelativeTime = (date: string | number | Date): string => {
    const targetDate = new Date(date);

    if (isNaN(targetDate.getTime())) {
        throw new Error("Invalid date");
    }

    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000);

    const units = [
        { name: "week", seconds: 604800 },
        { name: "day", seconds: 86400 },
        { name: "hour", seconds: 3600 },
        { name: "minute", seconds: 60 },
        { name: "second", seconds: 1 },
    ];

    for (const unit of units) {
        const unitValue = Math.floor(diffInSeconds / unit.seconds);
        if (unitValue >= 1) {
            return unitValue === 1 ? `1 ${unit.name} ago` : `${unitValue} ${unit.name}s ago`;
        }
    }

    return "just now";
};
