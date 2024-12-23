const express = require("express")

const app = express();
const allPageData = {}; 
let retryKeys = [];

const fetchDataUrl = (page) => {
    return `http://localhost:5000/articles?page=${page}&per_page=12`
}

app.get('/fetch', (req, res) => {
    handleApiData();
    res.send("Fetching data");
});

app.get('/', (req, res) => {
    res.send("Welcome to FETCH API HANDLER");
})

app.get('/final-response', (req, res) => {
    console.log("Working on it");
    res.json(allPageData); 
});




const fetchData = async (page) => {
    try {
        const response = await fetch(fetchDataUrl(page));
        if (!response.ok) {
            return null;
        }
        const data = await response.json();
        return data;
    } catch (error) {
        return null;
    }
};

const handleApiData = async () => {
    let isNext = true;
    let pageNo = 1;

    while (isNext) {
        const data = await fetchData(pageNo);
        if (data && data.data) {
            allPageData[pageNo] = data.data; 
            isNext = data.is_next; 
            if (!isNext) {
                console.log("Got Value in pageNo", pageNo);
            }
        } else {
            retryKeys.push(pageNo);
        }
        pageNo += 1;
    }

    console.log("allPageDetail", Object.keys(allPageData));

    while (retryKeys.length !== 0) {
        await fetchDataParallely();
    }
};

const fetchDataParallely = async () => {
    try {
        console.log("Current retryKeys:", retryKeys);

        if (retryKeys.length === 0) {
            console.log("No pages to fetch, retryKeys is empty.");
            return;
        }

        const promises = retryKeys.map((pageNo) => {
            return fetchData(pageNo)
                .then((data) => {
                    if (data) {
                        console.log(`Page ${pageNo} fetched successfully`);
                        return { status: "fulfilled", value: data, pageNo };
                    } else {
                        console.log(`Page ${pageNo} failed to fetch (data was null)`);
                        return { status: "fulfilled", value: null, pageNo }; 
                    }
                })
                .catch((error) => {
                    console.log(`Page ${pageNo} failed to fetch due to an error:`, error);
                    return { status: "rejected", reason: error, pageNo };
                });
        });

        const results = await Promise.allSettled(promises);

        results
            .filter((result) => result.status === "fulfilled" && result.value?.value)
            .forEach((result) => {
                if (result.value.value) {
                    allPageData[result.value.pageNo] = result.value.value.data;
                    console.log(`Added data for page ${result.value.pageNo}`);
                } else {
                    console.log(`No data for page ${result.value.pageNo}`);
                }
            });


        retryKeys = results
            .filter((result) => result.status === "fulfilled" && result.value.value === null)
            .map((result) => result.value.pageNo);



    } catch (error) {
        console.error("Unexpected error in fetchDataParallely:", error);
    }
};
 
app.listen(3000, () => {
    console.log('Server running on port 3000');
});
