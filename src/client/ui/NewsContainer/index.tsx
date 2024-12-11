import { formatTimeAMPM } from "../../../shared/functions"
import { NewsItem } from "../../../shared/types"
import Header from "../OverlayHeader"
import styles from "./styles.module.css"
import React, { useEffect, useMemo } from "react"

interface NewsContainerProps {
  isMobile: boolean
  newsPaper: NewsItem[]
  setIsNewsContainerCollapsed: (value: boolean) => void
}

const NewsContainer: React.FC<NewsContainerProps> = ({ isMobile, newsPaper, setIsNewsContainerCollapsed }) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsNewsContainerCollapsed(true)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [setIsNewsContainerCollapsed])

  const containerStyle = useMemo(() => {
    if (!isMobile) {
      const width = "450px"
      const height = "650px"
      const maxWidth = "calc(100vw - 40px)"
      const maxHeight = "calc(100vh - 40px)"
      return {
        width,
        height,
        maxWidth,
        maxHeight,
      }
    }
    return {}
  }, [isMobile])

  const sortedNews = useMemo(() => {
    return [...newsPaper].sort((a, b) => {
      const dateA = new Date(a.date).getTime()
      const dateB = new Date(b.date).getTime()
      return dateB - dateA // Sort in descending order (newest first)
    })
  }, [newsPaper])

  return (
    <div
      className={`${styles.container} ${isMobile ? styles.mobileContainer : styles.desktopContainer}`}
      style={containerStyle}
    >
      <Header
        isMobile={isMobile}
        text="News"
        onCollapseButtonClick={() => setIsNewsContainerCollapsed(true)}
        onBackButtonClick={null}
        onClearButtonClick={null}
      />
      <div className={styles.content}>
        {sortedNews.length > 0 ? (
          sortedNews.map((news, index) => (
            <div key={index} className={styles.newsItem}>
              <div className={styles.newsHeader}>
                <span className={styles.newsDate}>{formatTimeAMPM(new Date(news.date))}</span>
                {news.place && <span className={styles.newsPlace}>{news.place}</span>}
              </div>
              <div className={styles.newsMessage}>{news.message}</div>
            </div>
          ))
        ) : (
          <div className={styles.placeholder}>No news to display</div>
        )}
      </div>
    </div>
  )
}

export default NewsContainer
