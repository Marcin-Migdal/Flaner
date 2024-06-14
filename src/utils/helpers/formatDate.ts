export const formatDate = (
    date: string | number | Date,
    format: "date" | "date-time" | "date-exact-time" = "date",
    dateSeparator: "-" | "." | "/" | " " | "" = "-"
): string => {
    const parsedDate = new Date(date);

    if (isNaN(parsedDate.getTime())) {
        throw new Error("Invalid date");
    }

    const year = parsedDate.getFullYear();
    const month = padNumber(parsedDate.getMonth() + 1);
    const day = padNumber(parsedDate.getDate());
    const hours = padNumber(parsedDate.getHours());
    const minutes = padNumber(parsedDate.getMinutes());
    const seconds = padNumber(parsedDate.getSeconds());

    switch (format) {
        case "date":
            return `${year}${dateSeparator}${month}${dateSeparator}${day}`;
        case "date-time":
            return `${year}${dateSeparator}${month}${dateSeparator}${day} ${hours}:${minutes}`;
        case "date-exact-time":
            return `${year}${dateSeparator}${month}${dateSeparator}${day} ${hours}:${minutes}:${seconds}`;
    }
};

const padNumber = (number: number) => (number < 10 ? `0${number}` : `${number}`);
