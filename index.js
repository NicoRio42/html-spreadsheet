(function () {
    const spreadsheet = document.querySelector("[data-spreadsheet]");
    if (spreadsheet === null) return;

    const savedSpreadsheet = localStorage.getItem("spreadsheet")

    if (savedSpreadsheet !== null) {
        spreadsheet.innerHTML = savedSpreadsheet
    }

    document.getElementById("save-to-local-storage")?.addEventListener('click', () => {
        localStorage.setItem("spreadsheet", spreadsheet.innerHTML)
    })

    document.getElementById("clear-local-storage")?.addEventListener('click', () => {
        localStorage.removeItem("spreadsheet")
    })


    spreadsheet.addEventListener("focusout", (event) => {
        // @ts-ignore
        /** @type {HTMLInputElement} */ const input = event.target;
        if (input.tagName !== 'INPUT') return;
        const cellName = input.getAttribute("name")
        if (cellName === null) throw new Error("Cannot have cell without name.")

        if (input.value.startsWith("=")) {
            const value = input.value;
            input.dataset.formula = value;
            input.value = String(computeFormula(value.slice(1), input, cellName))
        } else {
            delete input.dataset.formula;
            cleanupDeps(input, cellName);
            delete input.dataset.deps;
        }

        if (input.value !== "" && input.value !== null && input.value !== undefined) {
            input.setAttribute('value', input.value);
        } else {
            input.removeAttribute("value")
        }

        updateObservers(input);
    })

    /**
     * @param {HTMLInputElement} input 
     */
    function updateObservers(input) {
        const observers = input.dataset.observers?.split(";") ?? []

        observers.forEach(observer => {
            const observerInput = spreadsheet?.querySelector(`[name=${observer}]`)
            if (!(observerInput instanceof HTMLInputElement)) throw new Error('Not an input')
            if (!observerInput.dataset.formula) throw new Error('No formula for this input')
            const formula = observerInput.dataset.formula.slice(1)
            observerInput.value = String(computeFormula(formula, observerInput, observer))
            updateObservers(observerInput);
        })
    }

    spreadsheet.addEventListener("focusin", (event) => {
        // @ts-ignore
        /** @type {HTMLInputElement} */ const input = event.target;
        if (input.tagName !== 'INPUT') return;
        if (input.dataset.formula) input.value = input.dataset.formula
    })

    /** @type {Set<string>} */
    let deps = new Set()

    /**
     * @param {string} formula 
     * @param {HTMLInputElement} input 
     * @param {string} cellName
     * @returns {string | number}
     */
    function computeFormula(formula, input, cellName) {
        try {
            deps.clear()
            cleanupDeps(input, cellName);
            const result = eval(formula);
            /** @type {string[]} */
            const depsArray = []

            deps.forEach(dep => {
                const input = spreadsheet?.querySelector(`[name=${dep}]`)
                if (!(input instanceof HTMLInputElement)) throw new Error('Not an input')
                const observers = input.dataset.observers?.split(";") ?? []
                if (observers.includes(cellName)) return;
                observers.push(cellName);
                input.dataset.observers = observers.filter(s => s !== '').join(";")
                depsArray.push(dep)
            })

            if (depsArray.length !== 0) input.dataset.deps = depsArray.filter(s => s !== '').join(';')
            return result;
        } catch (e) {
            console.error(e)
            return "## ERROR"
        }
    }

    /**
     * @param {HTMLInputElement} input 
     * @param {string} cellName 
     */
    function cleanupDeps(input, cellName) {
        const oldDeps = input.dataset.deps?.split(";") ?? []

        oldDeps.forEach(dep => {
            const depInput = spreadsheet?.querySelector(`[name=${dep}]`)
            if (!(depInput instanceof HTMLInputElement)) throw new Error('Not an input')
            const filteredObservers = depInput.dataset.observers?.split(";").filter(o => o !== cellName) ?? [];
            depInput.dataset.observers = filteredObservers.filter(s => s !== '').join(";")
        })
    }

    /**
     * @param {string} cellName 
     * @returns {string | number}
     */
    function at(cellName) {
        deps.add(cellName)
        const input = spreadsheet?.querySelector(`[name=${cellName}]`)
        if (!(input instanceof HTMLInputElement)) throw new Error('Not an input')
        const int = parseInt(input.value, 10);
        if (!isNaN(int)) return int;

        const float = parseFloat(input.value);
        if (!isNaN(float)) return float;

        return input.value;
    }

    /**
     * @param {string} column 
     * @param {string} lineStart 
     * @param {string} lineEnd
     */
    function sumColumn(column, lineStart, lineEnd) {
        const lineStartInt = parseInt(lineStart, 10)
        const lineEndInt = parseInt(lineEnd, 10)

        if (lineStartInt >= lineEndInt) {
            throw new Error('Line start should be less than line end.')
        }

        let sum = 0;

        for (let i = lineStartInt; i <= lineEndInt; i++) {
            const value = at(`${column}${i}`)
            if (typeof value !== "number") throw new Error("Cannot sum on something else tahn numbers");
            sum += value;
        }

        return sum
    }
})();