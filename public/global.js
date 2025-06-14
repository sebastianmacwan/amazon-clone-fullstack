let classes = ["bg-white", "bg-info", "bg-success", "bg-dark"];
        let textColors = ["text-dark", "text-dark", "text-dark", "text-white"];
        let current = 0;
        function mode() {
            const body = document.body;
            body.classList.remove(...classes, "text-white", "text-dark");
            current = (current + 1) % classes.length;
            body.classList.add(classes[current], textColors[current]);
            body.style.backgroundImage = "none";
        }