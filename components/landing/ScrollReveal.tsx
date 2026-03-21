"use client";

import { motion, type Variants } from "framer-motion";

const viewport = { once: true, amount: 0.12 };

type ScrollRevealProps = {
  children: React.ReactNode;
  className?: string;
  as?: "section" | "div";
  delay?: number;
  id?: string;
  /** Slight X offset for directional reveal (e.g. -24 for left, 24 for right) */
  xOffset?: number;
};

export default function ScrollReveal({
  children,
  className = "",
  as: Tag = "div",
  delay = 0,
  id,
  xOffset = 0,
}: ScrollRevealProps) {
  const MotionTag = motion[Tag] as typeof motion.div;
  return (
    <MotionTag
      id={id}
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      variants={{
        hidden: { opacity: 0, y: 12, x: xOffset },
        visible: {
          opacity: 1,
          y: 0,
          x: 0,
          transition: { duration: 0.35, delay, ease: [0.25, 0.1, 0.25, 1] },
        },
      }}
      className={className}
    >
      {children}
    </MotionTag>
  );
}

/** For two-column rows: text and media animate from opposite sides with stagger */
export const scrollRevealRowVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
};

export const scrollRevealFromLeft = {
  hidden: { opacity: 0, x: -12 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] },
  },
};

export const scrollRevealFromRight = {
  hidden: { opacity: 0, x: 12 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] },
  },
};

type ScrollRevealRowProps = {
  children: React.ReactNode;
  className?: string;
  direction?: "ltr" | "rtl";
};

export function ScrollRevealRow({
  children,
  className = "",
  direction = "ltr",
}: ScrollRevealRowProps) {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      variants={scrollRevealRowVariants}
      className={className}
    >
      {children}
    </motion.section>
  );
}

export function RevealBlock({
  children,
  className = "",
  from = "left",
}: {
  children: React.ReactNode;
  className?: string;
  from?: "left" | "right";
}) {
  return (
    <motion.div
      variants={from === "left" ? scrollRevealFromLeft : scrollRevealFromRight}
      className={className}
    >
      {children}
    </motion.div>
  );
}
