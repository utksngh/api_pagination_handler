const allPageData = {}; // Dictionary to store data with pageNo as key
let retryKeys = []; // Array to track failed pages for retry

const fetchDataUrl = (page) => {
    return `http://localhost:5000/articles?page=${page}&per_page=12`;
};

const fetchData = async (page) => {
    try {
        const response = await fetch(fetchDataUrl(page));
        if (!response.ok) {
            console.error("Encountered Error:", response.status);
            return null;
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Fetch Error:", error);
        return null;
    }
};

const handleApiData = async () => {
    let isNext = true;
    let pageNo = 1;

    // Fetch all pages sequentially
    while (isNext) {
        const data = await fetchData(pageNo);
        if (data && data.data) {
            allPageData[pageNo] = data.data; // Store data in dictionary with pageNo as key
            isNext = data.is_next; // Update isNext flag
            if (!isNext) {
                console.log("Got Value in pageNo", pageNo);
            }
        } else {
            retryKeys.push(pageNo); // Track failed pages
        }
        pageNo += 1;
    }

    while (retryKeys.length !== 0) {
        await fetchDataParallely();
    }

    console.log("Final All Page Data:", allPageData);
    console.log("Final Retry Keys:", retryKeys);
};

const fetchDataParallely = async () => {
    try {
        const promises = retryKeys.map((pageNo) =>
            fetchData(pageNo).then(
                (data) => ({ status: "fulfilled", value: data, pageNo }),
                (error) => ({ status: "rejected", reason: error, pageNo })
            )
        );

        const results = await Promise.allSettled(promises);

        results
            .filter((result) => result.status === "fulfilled" && result.value?.data)
            .forEach((result) => {
                allPageData[result.pageNo] = result.value.data; 
            });

        retryKeys = results
            .filter((result) => result.status === "rejected")
            .map((result) => result.pageNo);

        console.log("All page data after retries:", allPageData);
        console.log("Retry keys after retries:", retryKeys);
    } catch (error) {
        console.error("Unexpected error in fetchDataParallely:", error);
    }
};

// Run the main function
handleApiData().then(() => {
    console.log("All page data (final):", allPageData);
    console.log("Retry keys (failed pages, final):", retryKeys);
});
