# Lotto Number Generator

## Overview

This is a simple web application that generates and displays a set of random lottery numbers. It's built using modern web technologies, including Web Components, to create a clean and interactive user experience.

## Project Outline

### Style and Design

*   **Layout:** A centered, clean layout that is responsive and works well on both mobile and desktop screens.
*   **Color Palette:** A vibrant and energetic color scheme will be used for the lottery balls to make them visually appealing. The background will have a subtle texture.
*   **Typography:** Clear and readable fonts will be used for the title and the numbers.
*   **Visual Effects:**
    *   The lottery balls will have a multi-layered drop shadow to create a sense of depth.
    *   The "Generate" button will have a "glow" effect on interaction.
    *   An animation will be used to reveal the generated numbers.

### Features

*   **Lottery Number Generation:** Generates 6 unique random numbers between 1 and 45.
*   **Web Component:** A `<lotto-ball>` custom element is used to display each number, encapsulating its style and behavior.
*   **Interactive Button:** A button to trigger the generation of a new set of numbers.

## Current Plan

1.  **Update `index.html`:**
    *   Set up the main structure with a title, a container for the lottery balls, and a "Generate Numbers" button.
2.  **Update `style.css`:**
    *   Apply styles for the overall page, container, lottery balls, and the button to match the design outlined above.
3.  **Update `main.js`:**
    *   Create the `LottoBall` web component.
    *   Implement the logic to generate and display the 6 unique lottery numbers when the button is clicked.
